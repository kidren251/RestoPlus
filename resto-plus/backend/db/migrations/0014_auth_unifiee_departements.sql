-- P1 : identité unifiée avec Supabase Auth + départements en données.
--
-- 1. `users` devient le PROFIL d'un compte Supabase Auth : même id que auth.users.
--    Jusqu'ici la table avait son propre id et dupliquait des informations portées par
--    restaurant_members (rôle, niveau, restaurant) : deux sources de vérité qui auraient
--    fini par diverger. Le niveau, le département et le restaurant d'un utilisateur ne
--    viennent plus QUE de restaurant_members.
--
-- 2. Les pôles fermés `check (pole in ('salle', 'cuisine'))` deviennent des
--    DÉPARTEMENTS activés par établissement (catalogue de types :
--    packages/types/src/departements.ts). Chaque colonne `pole` devient `departement`
--    et référence un département activé dans le même restaurant.
--
-- Base encore vide de données réelles : c'est le moment le moins cher pour ces
-- changements (voir docs/axes-de-progression.md, « Départements hôteliers », étape A).

-- ─── 1. Profil utilisateur relié à Supabase Auth ──────────────────────────────────

alter table users drop constraint if exists users_access_role_check;
alter table users drop column role;
alter table users drop column service;
alter table users drop column access_role;
alter table users drop column restaurant_id;
alter table users alter column id drop default;
alter table users
  add constraint users_auth_fk foreign key (id) references auth.users(id) on delete cascade;
-- Supprimer un compte Auth supprime son profil, SAUF si la personne a laissé une trace
-- métier (compte rendu validé, délégation, message…) : les clés étrangères de ces
-- tables bloquent alors la suppression, ce qui protège l'historique. Un employé qui
-- part est désactivé (restaurant_members.actif = false), pas supprimé.

-- Le profil est créé automatiquement à la création du compte Auth (activation par
-- code, invitation QR, création par la plateforme). Le nom vient des métadonnées
-- passées par l'API : auth.admin.createUser({ user_metadata: { nom } }).
create or replace function creer_profil_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, nom)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nom'), ''), 'Sans nom'));
  return new;
end;
$$;

create trigger auth_users_creer_profil
  after insert on auth.users
  for each row execute function creer_profil_utilisateur();

-- ─── 2. Départements activés par établissement ────────────────────────────────────

create table departements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  -- Type du catalogue (TypeDepartement) : pas de département libre.
  type text not null check (type in ('direction', 'salle', 'cuisine', 'maintenance', 'espaces_verts', 'gouvernance')),
  -- Renommable par le N3 ; par défaut, le libellé du catalogue.
  nom text not null,
  actif boolean not null default true,
  -- Copié du catalogue à l'activation : compte rendu requis pour clôturer la journée.
  compte_rendu_quotidien boolean not null default false,
  created_at timestamptz not null default now(),
  -- Un département de chaque type par établissement : c'est la cible des clés
  -- étrangères (restaurant_id, departement) des autres tables.
  unique (restaurant_id, type)
);

alter table departements enable row level security;
create policy departements_lecture on departements
  for select using (is_restaurant_member(restaurant_id));

-- Remplace chaque colonne `pole` par `departement`, rattachée à un département activé
-- du même restaurant (une valeur nulle reste permise là où `pole` l'était).

-- restaurant_members (direction / salle / cuisine)
alter table restaurant_members drop constraint restaurant_members_pole_check;
alter table restaurant_members alter column pole drop default;
alter table restaurant_members rename column pole to departement;
alter table restaurant_members
  add constraint restaurant_members_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- restaurant_invitations (intérimaires)
alter table restaurant_invitations drop constraint restaurant_invitations_pole_check;
alter table restaurant_invitations alter column pole drop default;
alter table restaurant_invitations rename column pole to departement;
alter table restaurant_invitations
  add constraint restaurant_invitations_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- conversations (canal d'un département ; nul pour annonce et message direct)
alter table conversations drop constraint conversations_pole_check;
alter table conversations drop constraint conversations_canal_has_pole;
alter table conversations rename column pole to departement;
alter table conversations
  add constraint conversations_canal_a_un_departement check (type <> 'canal' or departement is not null);
alter table conversations
  add constraint conversations_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- comptes_rendus (un par département et par journée de service)
alter table comptes_rendus drop constraint comptes_rendus_pole_check;
alter table comptes_rendus rename column pole to departement;
alter table comptes_rendus
  add constraint comptes_rendus_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- comptes_equipe (comptes permanents N0-N2)
alter table comptes_equipe drop constraint comptes_equipe_pole_check;
alter table comptes_equipe rename column pole to departement;
alter table comptes_equipe
  add constraint comptes_equipe_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- delegations (le N1 reçoit les droits N2 de SON département)
alter table delegations drop constraint delegations_pole_check;
alter table delegations rename column pole to departement;
alter index delegations_restaurant_pole_idx rename to delegations_restaurant_departement_idx;
alter table delegations
  add constraint delegations_departement_fk foreign key (restaurant_id, departement)
  references departements(restaurant_id, type);

-- ─── 3. Clôture de journée : départements requis au lieu de « salle ET cuisine » ───
-- Une journée de service est close quand chaque département actif avec
-- compte_rendu_quotidien a validé son compte rendu ; l'instant de clôture est celui
-- de la dernière validation requise.

drop view journees_service;
create view journees_service with (security_invoker = true) as
with validations as (
  select restaurant_id, date_service, departement, min(valide_at) as valide_at
  from comptes_rendus
  group by restaurant_id, date_service, departement
),
requis as (
  select restaurant_id, type
  from departements
  where actif and compte_rendu_quotidien
)
select
  v.restaurant_id,
  v.date_service,
  jsonb_object_agg(v.departement, v.valide_at) as validations,
  case
    when count(r.type) = (select count(*) from requis r2 where r2.restaurant_id = v.restaurant_id)
     and count(r.type) > 0
    then max(v.valide_at) filter (where r.type is not null)
  end as cloture_at
from validations v
left join requis r on r.restaurant_id = v.restaurant_id and r.type = v.departement
group by v.restaurant_id, v.date_service;
