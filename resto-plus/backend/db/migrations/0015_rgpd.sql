-- RGPD : allergies limitées au repas, durées de conservation, anonymisation et purge
-- automatique.
-- Registre et décisions à faire valider : docs/rgpd.md.
--
-- Principe : on ANONYMISE plutôt que de supprimer. Les lignes restent (chiffre
-- d'affaires, stock, HACCP, comptes rendus gardent leur cohérence), mais plus rien ne
-- permet d'identifier la personne. Le journal d'audit est l'exception assumée : il
-- garde le nom de l'acteur pendant sa durée de conservation légale (traçabilité HACCP,
-- comptable et de sécurité), puis il est purgé (audit_purger_expires, 0012).

-- ─── 1. Durées de conservation, réglables par établissement ──────────────────────
-- Valeurs par défaut à faire valider (docs/rgpd.md).
alter table restaurants
  add column conservation_clients_mois smallint not null default 36
    check (conservation_clients_mois between 1 and 120),
  add column conservation_messages_mois smallint not null default 12
    check (conservation_messages_mois between 1 and 120),
  add column conservation_anciens_membres_mois smallint not null default 12
    check (conservation_anciens_membres_mois between 0 and 120);

-- ─── 2. Allergies : le temps du repas, jamais sur la fiche client ────────────────
-- Les allergies sont des données de santé (article 9 du RGPD). Décision du 21/10/2026 :
-- on ne les garde PAS sur la fiche client (dossier durable), seulement sur la
-- réservation du repas concerné, et elles sont effacées dès que le repas est fini.
-- Un client sans réservation (walk-in) a lui aussi une réservation, source 'walk_in'.
alter table clients drop column allergies;
alter table clients add column anonymise_at timestamptz;

-- Le client signale lui-même ses allergies pour ce repas : c'est son consentement,
-- dont on garde l'heure. Sans elle, la base refuse d'enregistrer des allergies.
alter table reservations
  add column allergenes_signales_at timestamptz,
  add column anonymise_at timestamptz,
  add constraint reservations_allergenes_signales
    check (cardinality(allergenes) = 0 or allergenes_signales_at is not null);

-- Effacement immédiat quand le repas se termine ou que la réservation est annulée.
create or replace function reservations_effacer_allergenes_fin_repas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('terminee', 'annulee') then
    new.allergenes := '{}';
    new.allergenes_signales_at := null;
  end if;
  return new;
end;
$$;

create trigger reservations_effacer_allergenes
  before insert or update of status on reservations
  for each row execute function reservations_effacer_allergenes_fin_repas();

-- Filet de sécurité (toutes les heures, voir § 6) : une table jamais clôturée dans
-- l'app n'en garde pas moins ses allergies au-delà de sa journée de service.
create or replace function effacer_allergenes_services_passes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.reservations set allergenes = '{}', allergenes_signales_at = null
  where cardinality(allergenes) > 0
    and coalesce(date_service, public.jour_de_service(heure, restaurant_id))
        < public.jour_de_service(now(), restaurant_id);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ─── 3. Membres : date de départ, base du délai d'anonymisation ──────────────────
alter table users add column anonymise_at timestamptz;
alter table restaurant_members add column desactive_at timestamptz;

create or replace function membres_dater_desactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.actif then
    new.desactive_at := null;
  elsif old.actif or new.desactive_at is null then
    new.desactive_at := coalesce(new.desactive_at, now());
  end if;
  return new;
end;
$$;

create trigger restaurant_members_dater_desactivation
  before update of actif on restaurant_members
  for each row execute function membres_dater_desactivation();

-- ─── 4. Anonymisation à la demande (droit à l'effacement) ────────────────────────

-- Un client : fiche et réservations. Le nombre de couverts, les dates et le chiffre
-- d'affaires restent (statistiques), plus rien d'identifiant ni de santé.
create or replace function rgpd_anonymiser_client(p_client_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clients set
    nom = 'Client anonymisé',
    telephone = null,
    email = null,
    preferences = null,
    notes = null,
    anonymise_at = now()
  where id = p_client_id and anonymise_at is null;

  update public.reservations set
    nom_client = 'Client anonymisé',
    allergenes = '{}',
    allergenes_signales_at = null,
    notes = null,
    anonymise_at = now()
  where client_id = p_client_id and anonymise_at is null;
$$;

-- Un membre qui quitte un établissement : accès coupé, nom remplacé. Le profil n'est
-- anonymisé que s'il n'est plus actif nulle part (un extra peut travailler ailleurs).
-- Le compte Supabase Auth (e-mail, mot de passe) est effacé par l'API juste après :
-- auth.admin.deleteUser(id, true) — suppression « douce » qui garde la ligne pour
-- l'historique mais efface l'e-mail et rend toute connexion impossible.
create or replace function rgpd_anonymiser_membre(p_user_id uuid, p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pseudonyme text := 'Ancien membre ' || upper(left(p_user_id::text, 4));
begin
  update public.restaurant_members set actif = false
  where user_id = p_user_id and restaurant_id = p_restaurant_id;

  update public.comptes_equipe set statut = 'desactive', nom = pseudonyme
  where user_id = p_user_id and restaurant_id = p_restaurant_id;

  if not exists (select 1 from public.restaurant_members where user_id = p_user_id and actif) then
    update public.users set nom = pseudonyme, anonymise_at = now()
    where id = p_user_id and anonymise_at is null;
  end if;
end;
$$;

-- ─── 5. Purge automatique (tous les jours, voir § 6) ─────────────────────────────
create or replace function rgpd_purger()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  m record;
  limite timestamptz;
  clients_anonymises int := 0;
  reservations_anonymisees int := 0;
  messages_supprimes int := 0;
  membres_anonymises int := 0;
  n int;
begin
  for r in select * from public.restaurants loop
    -- Clients sans visite ni réservation à venir depuis la durée de conservation.
    limite := now() - make_interval(months => r.conservation_clients_mois);
    for m in
      select c.id from public.clients c
      where c.restaurant_id = r.id
        and c.anonymise_at is null
        and coalesce(c.last_visit_at, c.created_at) < limite
        and not exists (
          select 1 from public.reservations res
          where res.client_id = c.id and res.heure >= limite
        )
    loop
      perform public.rgpd_anonymiser_client(m.id);
      clients_anonymises := clients_anonymises + 1;
    end loop;

    -- Réservations anciennes sans fiche client (prises au téléphone, sans compte).
    update public.reservations set
      nom_client = 'Client anonymisé', allergenes = '{}', allergenes_signales_at = null,
      notes = null, anonymise_at = now()
    where restaurant_id = r.id and client_id is null and anonymise_at is null and heure < limite;
    get diagnostics n = row_count;
    reservations_anonymisees := reservations_anonymisees + n;

    -- Messagerie interne.
    delete from public.chat_messages
    where restaurant_id = r.id
      and created_at < now() - make_interval(months => r.conservation_messages_mois);
    get diagnostics n = row_count;
    messages_supprimes := messages_supprimes + n;

    -- Anciens membres, une fois le délai écoulé depuis leur départ.
    for m in
      select rm.user_id from public.restaurant_members rm
      join public.users u on u.id = rm.user_id
      where rm.restaurant_id = r.id
        and not rm.actif
        and u.anonymise_at is null
        and rm.desactive_at < now() - make_interval(months => r.conservation_anciens_membres_mois)
    loop
      perform public.rgpd_anonymiser_membre(m.user_id, r.id);
      membres_anonymises := membres_anonymises + 1;
    end loop;
  end loop;

  -- Journal d'audit : fin des durées de conservation légales (0012).
  perform public.audit_purger_expires();

  return jsonb_build_object(
    'clients_anonymises', clients_anonymises,
    'reservations_anonymisees', reservations_anonymisees,
    'messages_supprimes', messages_supprimes,
    'membres_anonymises', membres_anonymises
  );
end;
$$;

-- ─── 6. Exécution automatique (pg_cron, fourni par Supabase) ─────────────────────
create extension if not exists pg_cron;
select cron.schedule('rgpd-purge-quotidienne', '30 3 * * *', 'select public.rgpd_purger()');
select cron.schedule('allergenes-fin-de-service', '0 * * * *', 'select public.effacer_allergenes_services_passes()');

-- ─── 7. Ces fonctions ne sont appelables QUE par l'API (clé service_role) ────────
-- Supabase expose toute fonction du schéma public en RPC à la clé publique (anon) et
-- aux sessions (authenticated). Une fonction security definer s'exécute avec les
-- droits de son propriétaire : sans ces revoke, n'importe quel porteur de la clé
-- publique pourrait anonymiser un client ou purger le journal d'audit.
-- (Corrige au passage audit_purger_expires, exposée depuis 0012.)
revoke execute on function
  public.audit_purger_expires(),
  public.rgpd_purger(),
  public.rgpd_anonymiser_client(uuid),
  public.rgpd_anonymiser_membre(uuid, uuid),
  public.effacer_allergenes_services_passes(),
  public.creer_profil_utilisateur(),
  public.membres_dater_desactivation(),
  public.reservations_effacer_allergenes_fin_repas()
from public, anon, authenticated;

grant execute on function
  public.audit_purger_expires(),
  public.rgpd_purger(),
  public.rgpd_anonymiser_client(uuid),
  public.rgpd_anonymiser_membre(uuid, uuid),
  public.effacer_allergenes_services_passes()
to service_role;
