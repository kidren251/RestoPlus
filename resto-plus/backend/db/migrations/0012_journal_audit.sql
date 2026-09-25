-- Journal d'audit infalsifiable. Miroir de backend/api/src/audit.ts.
--
-- Garanties :
-- 1. Append-only : UPDATE est toujours refusé ; DELETE n'est permis qu'à la fonction de
--    purge légale (fin de durée de conservation), jamais directement.
-- 2. Chaîne d'empreintes par restaurant et par catégorie : chaque ligne contient le
--    SHA-256 de la précédente. Toute modification faite en contournant ces protections
--    (ex. accès direct d'un administrateur de la base) est détectée par l'API.
-- 3. Aucune policy RLS de lecture : seule l'API (clé service_role) lit le journal, et ne
--    le montre qu'au N3 de l'établissement (droit "audit.consulter").

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  categorie text not null check (categorie in ('comptabilite', 'haccp', 'administration', 'securite')),
  sequence bigint not null check (sequence > 0),
  action text not null,
  at timestamptz not null default now(),
  acteur jsonb,   -- { id, nom, accessRole, pole, parDelegation }
  cible jsonb,    -- { type, id, libelle }
  avant jsonb,
  apres jsonb,
  details jsonb,  -- jamais de contenu de message, de donnée client, de code ni de mot de passe
  empreinte_precedente text not null,
  empreinte text not null unique,
  unique (restaurant_id, categorie, sequence)
);
create index audit_log_restaurant_at_idx on audit_log(restaurant_id, at desc);

-- Ancre de chaque chaîne après purge : empreinte du dernier événement retiré.
create table audit_ancres (
  restaurant_id uuid not null references restaurants(id),
  categorie text not null,
  sequence bigint not null,
  empreinte text not null,
  primary key (restaurant_id, categorie)
);

-- Durées de conservation (à valider par un juriste / DPO).
create table audit_conservation (
  categorie text primary key,
  annees integer not null check (annees > 0)
);
insert into audit_conservation values ('comptabilite', 10), ('haccp', 5), ('administration', 5), ('securite', 1);

create or replace function audit_log_interdire_modification()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Le journal d''audit ne peut pas être modifié.';
  end if;
  if coalesce(current_setting('resto_plus.purge_audit', true), '') <> 'autorisee' then
    raise exception 'Le journal d''audit ne peut pas être supprimé (hors purge légale).';
  end if;
  return old;
end;
$$;

create trigger audit_log_append_only
  before update or delete on audit_log
  for each row execute function audit_log_interdire_modification();

-- Purge légale : retire, chaîne par chaîne, les événements plus vieux que leur durée de
-- conservation (toujours en tête de chaîne) et enregistre l'ancre correspondante.
create or replace function audit_purger_expires()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  chaine record;
begin
  perform set_config('resto_plus.purge_audit', 'autorisee', true);
  for chaine in
    select l.restaurant_id, l.categorie, max(l.sequence) as sequence
    from audit_log l
    join audit_conservation c on c.categorie = l.categorie
    where l.at < now() - make_interval(years => c.annees)
    group by l.restaurant_id, l.categorie
  loop
    insert into audit_ancres (restaurant_id, categorie, sequence, empreinte)
    select restaurant_id, categorie, sequence, empreinte
    from audit_log
    where restaurant_id = chaine.restaurant_id and categorie = chaine.categorie and sequence = chaine.sequence
    on conflict (restaurant_id, categorie) do update
      set sequence = excluded.sequence, empreinte = excluded.empreinte;

    delete from audit_log
    where restaurant_id = chaine.restaurant_id and categorie = chaine.categorie and sequence <= chaine.sequence;
  end loop;
  perform set_config('resto_plus.purge_audit', '', true);
end;
$$;

alter table audit_log enable row level security;
alter table audit_ancres enable row level security;
revoke update, delete, truncate on audit_log from public, anon, authenticated;
