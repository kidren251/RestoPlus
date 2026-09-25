-- Journée de service, délégation des tâches et accès messagerie.
-- Miroir de packages/types/src/serviceDay.ts, backend/api/src/delegationStore.ts et
-- de l'accès messagerie réglé par le N3 (routes/comptes.ts, routes/messaging.ts).

-- 1. Journée de service : elle bascule à une heure du petit matin, dans le fuseau du
-- restaurant, pas à minuit. Un dîner fini à 2h appartient au service de la veille.
alter table restaurants add column fuseau_horaire text not null default 'Europe/Paris';
alter table restaurants add column heure_bascule_service smallint not null default 5
  check (heure_bascule_service between 0 and 12);

create or replace function jour_de_service(instant timestamptz, target_restaurant_id uuid)
returns date
language sql
stable
set search_path = public
as $$
  select ((instant at time zone r.fuseau_horaire) - make_interval(hours => r.heure_bascule_service))::date
  from restaurants r
  where r.id = target_restaurant_id
$$;

-- Une réservation appartient à une journée de service (une table à 0h30 fait partie
-- du service de la veille) : on la stocke plutôt que de la déduire de l'heure.
alter table reservations add column date_service date;
update reservations set date_service = jour_de_service(heure, restaurant_id) where restaurant_id is not null;
create index reservations_restaurant_date_service_idx on reservations(restaurant_id, date_service);

alter table comptes_rendus add column valide_par_delegation boolean not null default false;

-- 2. Délégation des tâches : le N3 confie à un N1 les responsabilités du N2 de son pôle.
create table delegations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  delegue_id uuid not null references users(id),
  pole text not null check (pole in ('salle', 'cuisine')),
  debut timestamptz not null default now(),
  fin timestamptz not null,
  cree_par uuid not null references users(id),
  revoquee_at timestamptz,
  constraint delegations_periode_valide check (fin > debut)
);
-- « Une seule délégation active par pôle » est appliqué par l'API (elle révoque la
-- précédente) : une contrainte unique ne peut pas tenir compte de `fin > now()`.
create index delegations_restaurant_pole_idx on delegations(restaurant_id, pole, fin desc);

alter table delegations enable row level security;
create policy delegations_isolation on delegations
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

-- 3. Accès messagerie réglé par le N3, par membre.
alter table restaurant_members add column messagerie boolean not null default true;
alter table comptes_equipe add column messagerie boolean not null default true;

-- 4. Clôture de journée : une journée de service est close quand les comptes rendus
-- salle ET cuisine sont validés ; l'instant de clôture est celui de la seconde
-- validation (voir backend/api/src/journeeStore.ts).
create view journees_service as
select
  restaurant_id,
  date_service,
  min(valide_at) filter (where pole = 'salle') as salle_valide_at,
  min(valide_at) filter (where pole = 'cuisine') as cuisine_valide_at,
  case
    when count(*) filter (where pole = 'salle') > 0 and count(*) filter (where pole = 'cuisine') > 0
    then greatest(min(valide_at) filter (where pole = 'salle'), min(valide_at) filter (where pole = 'cuisine'))
  end as cloture_at
from comptes_rendus
group by restaurant_id, date_service;
