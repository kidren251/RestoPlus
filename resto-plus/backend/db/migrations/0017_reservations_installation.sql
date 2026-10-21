-- Réservations branchées sur Supabase + installation des clients à table.
-- Décisions du 21/10/2026 :
--  - un client sans réservation (walk-in) reçoit une réservation 'walk_in', visible dans
--    la liste du soir avec le badge « sans résa » ;
--  - annuler une réservation = statut 'annulee' (pas de suppression) ;
--  - installer des clients (avec ou sans réservation) et changer un client de table se
--    font en un geste depuis le panneau de la table, dès N0 (droit service.installer).

-- ─── 0. Droits du service réglables par établissement (console N4) ──────────────
-- Niveau minimum de quelques droits du service, par établissement : liste fermée et
-- validation dans packages/types/src/permissions.ts (PERMISSIONS_REGLABLES). Les pôles
-- et les droits sensibles ne sont pas réglables. {} = valeurs par défaut.
alter table restaurants
  add column reglages_droits jsonb not null default '{}'::jsonb
    check (jsonb_typeof(reglages_droits) = 'object');

-- ─── 1. Heure locale de la réservation ───────────────────────────────────────────
-- L'app manipule « 19:30 » + la journée de service ; la base garde l'instant exact.
-- Une réservation à 0h30 sur la journée du 21 a lieu le 22 à 0h30 (avant l'heure de
-- bascule). Le trigger fait la conversion avec le fuseau du restaurant.
alter table reservations add column heure_locale time;

create or replace function reservations_calculer_heure()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r public.restaurants;
begin
  select * into r from public.restaurants where id = new.restaurant_id;
  if new.heure_locale is not null and new.date_service is not null then
    new.heure := (
      new.date_service
      + case when new.heure_locale < make_time(r.heure_bascule_service, 0, 0) then 1 else 0 end
      + new.heure_locale
    ) at time zone r.fuseau_horaire;
  elsif new.heure is not null then
    new.heure_locale := (new.heure at time zone r.fuseau_horaire)::time;
    new.date_service := coalesce(new.date_service, public.jour_de_service(new.heure, new.restaurant_id));
  end if;
  return new;
end;
$$;

create trigger reservations_heure
  before insert or update of heure, heure_locale, date_service on reservations
  for each row execute function reservations_calculer_heure();

alter table reservations alter column restaurant_id set not null;
alter table reservations alter column date_service set not null;
create index reservations_restaurant_statut_idx on reservations(restaurant_id, date_service, status);

-- ─── 2. Déroulé du dîner ─────────────────────────────────────────────────────────
alter table service_events alter column restaurant_id set not null;
alter table service_events drop constraint service_events_type_check;
alter table service_events add constraint service_events_type_check
  check (type in ('arrivee', 'installation', 'changement_table', 'entree_servie', 'plat_servi',
                  'dessert_servi', 'addition', 'depart', 'note'));

-- ─── 3. Gestes du service, en une transaction chacun ─────────────────────────────
-- Plusieurs tables changent ensemble (table, réservation, repas en cours, déroulé) :
-- ces fonctions garantissent que tout est fait, ou rien.

-- Installer des clients à une table : une réservation existante (même prévue pour une
-- autre table : le client a demandé à changer), ou un walk-in créé à la volée.
create or replace function installer_clients(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_reservation_id uuid,
  p_couverts integer,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table public.tables_salle;
  v_resa public.reservations;
  v_etat public.etat_service_tables;
begin
  select * into v_table from public.tables_salle
  where id = p_table_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception 'TABLE_INTROUVABLE'; end if;
  if v_table.statut = 'occupee' then raise exception 'TABLE_OCCUPEE'; end if;

  if p_reservation_id is null then
    insert into public.reservations (restaurant_id, table_id, nom_client, couverts, heure, source, status)
    values (p_restaurant_id, p_table_id, 'Sans réservation', greatest(coalesce(p_couverts, 1), 1), p_at, 'walk_in', 'installee')
    returning * into v_resa;
  else
    update public.reservations set table_id = p_table_id, status = 'installee'
    where id = p_reservation_id and restaurant_id = p_restaurant_id and status in ('a_venir', 'arrivee')
    returning * into v_resa;
    if not found then raise exception 'RESERVATION_INTROUVABLE'; end if;
  end if;

  insert into public.etat_service_tables as e (
    table_id, restaurant_id, reservation_id, client_id, client_nom, course, dish_status,
    seated_at, last_event_at, allergenes, allergenes_signales_at
  ) values (
    p_table_id, p_restaurant_id, v_resa.id, v_resa.client_id, v_resa.nom_client, 'entree', 'aucun',
    p_at, p_at, v_resa.allergenes, v_resa.allergenes_signales_at
  )
  on conflict (table_id) do update set
    reservation_id = excluded.reservation_id, client_id = excluded.client_id,
    client_nom = excluded.client_nom, course = excluded.course, dish_status = excluded.dish_status,
    seated_at = excluded.seated_at, last_event_at = excluded.last_event_at,
    allergenes = excluded.allergenes, allergenes_signales_at = excluded.allergenes_signales_at
  returning * into v_etat;

  update public.tables_salle set statut = 'occupee' where id = p_table_id;

  insert into public.service_events (reservation_id, table_id, restaurant_id, type, label, occurred_at)
  values (v_resa.id, p_table_id, p_restaurant_id, 'installation',
          case when v_resa.source = 'walk_in' then 'Clients installés (sans réservation)' else 'Clients installés' end,
          p_at);

  return jsonb_build_object('etat', to_jsonb(v_etat), 'reservation', to_jsonb(v_resa));
end;
$$;

-- Changer de table un repas en cours : client, étape, allergies et réservation suivent.
create or replace function deplacer_repas(
  p_restaurant_id uuid,
  p_de_table_id uuid,
  p_vers_table_id uuid,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_de public.tables_salle;
  v_vers public.tables_salle;
  v_etat public.etat_service_tables;
begin
  select * into v_de from public.tables_salle where id = p_de_table_id and restaurant_id = p_restaurant_id for update;
  select * into v_vers from public.tables_salle where id = p_vers_table_id and restaurant_id = p_restaurant_id for update;
  if v_de.id is null or v_vers.id is null then raise exception 'TABLE_INTROUVABLE'; end if;
  if v_vers.statut = 'occupee' then raise exception 'TABLE_OCCUPEE'; end if;

  delete from public.etat_service_tables where table_id = p_vers_table_id; -- reste d'un repas fini
  update public.etat_service_tables set table_id = p_vers_table_id, last_event_at = p_at
  where table_id = p_de_table_id and restaurant_id = p_restaurant_id
  returning * into v_etat;
  if not found then raise exception 'AUCUN_REPAS'; end if;

  update public.reservations set table_id = p_vers_table_id where id = v_etat.reservation_id;
  update public.tables_salle set statut = 'libre' where id = p_de_table_id;
  update public.tables_salle set statut = 'occupee' where id = p_vers_table_id;

  if v_etat.reservation_id is not null then
    insert into public.service_events (reservation_id, table_id, restaurant_id, type, label, occurred_at)
    values (v_etat.reservation_id, p_vers_table_id, p_restaurant_id, 'changement_table',
            'Changement de table : ' || coalesce(v_de.nom, 'table') || ' → ' || coalesce(v_vers.nom, 'table'), p_at);
  end if;

  return to_jsonb(v_etat);
end;
$$;

-- Addition envoyée : table à nettoyer, réservation terminée (ses allergies sont effacées
-- par le trigger de 0015), allergies du repas effacées.
create or replace function terminer_repas(p_restaurant_id uuid, p_table_id uuid, p_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation_id uuid;
begin
  update public.tables_salle set statut = 'a_nettoyer' where id = p_table_id and restaurant_id = p_restaurant_id;
  if not found then raise exception 'TABLE_INTROUVABLE'; end if;

  update public.etat_service_tables set allergenes = '{}', allergenes_signales_at = null, last_event_at = p_at
  where table_id = p_table_id
  returning reservation_id into v_reservation_id;

  if v_reservation_id is not null then
    update public.reservations set status = 'terminee' where id = v_reservation_id;
    insert into public.service_events (reservation_id, table_id, restaurant_id, type, label, occurred_at)
    values (v_reservation_id, p_table_id, p_restaurant_id, 'addition', 'Addition envoyée', p_at);
  end if;
end;
$$;

revoke execute on function
  public.installer_clients(uuid, uuid, uuid, integer, timestamptz),
  public.deplacer_repas(uuid, uuid, uuid, timestamptz),
  public.terminer_repas(uuid, uuid, timestamptz),
  public.reservations_calculer_heure()
from public, anon, authenticated;

grant execute on function
  public.installer_clients(uuid, uuid, uuid, integer, timestamptz),
  public.deplacer_repas(uuid, uuid, uuid, timestamptz),
  public.terminer_repas(uuid, uuid, timestamptz)
to service_role;
