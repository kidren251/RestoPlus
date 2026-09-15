-- Row Level Security : cloisonnement effectif par restaurant.
-- Complète l'isolation logique posée en 0003 (colonnes restaurant_id) par une
-- isolation appliquée par Postgres lui-même, indépendante du code applicatif.
--
-- Prérequis pour que ceci fonctionne une fois le backend branché sur Supabase :
-- le backend doit interroger la base avec SUPABASE_SERVICE_ROLE_KEY (qui contourne
-- la RLS — l'autorisation est déjà vérifiée dans backend/api/src/auth.ts), jamais
-- avec la clé anon. Voir backend/api/src/supabase.ts.
--
-- checklist_entries et users avaient déjà `enable row level security` depuis 0001
-- sans policy : ces tables étaient donc déjà verrouillées (deny-all) pour tout rôle
-- autre que service_role. Ce fichier leur ajoute des policies adaptées plutôt que de
-- changer ce comportement par défaut.

-- checklist_entries n'avait pas de restaurant_id : nécessaire pour la scoper.
alter table checklist_entries add column restaurant_id uuid references restaurants(id);
create index checklist_entries_restaurant_idx on checklist_entries(restaurant_id);

-- Fonctions utilitaires (security definer : évite la récursion des policies qui
-- interrogent restaurant_members pour statuer sur restaurant_members lui-même).
create or replace function is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_members rm
    where rm.restaurant_id = target_restaurant_id
      and rm.user_id = auth.uid()
      and rm.actif = true
  );
$$;

create or replace function is_restaurant_admin(target_restaurant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_members rm
    where rm.restaurant_id = target_restaurant_id
      and rm.user_id = auth.uid()
      and rm.actif = true
      and rm.access_role in ('manager_admin', 'directeur_admin', 'access_admin')
  );
$$;

-- restaurants : visible seulement par ses membres. Création réservée à la plateforme
-- (route /platform/restaurants, exécutée avec service_role — hors RLS).
alter table restaurants enable row level security;
create policy restaurants_select on restaurants
  for select using (is_restaurant_member(id));

-- restaurant_members : chacun voit les membres de ses propres restaurants,
-- seuls les admins gèrent (ajout/retrait/changement de rôle).
alter table restaurant_members enable row level security;
create policy restaurant_members_select on restaurant_members
  for select using (is_restaurant_member(restaurant_id));
create policy restaurant_members_manage on restaurant_members
  for all using (is_restaurant_admin(restaurant_id))
  with check (is_restaurant_admin(restaurant_id));

-- Données métier : isolation stricte par restaurant.
alter table salles enable row level security;
create policy salles_isolation on salles
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table tables_salle enable row level security;
create policy tables_salle_isolation on tables_salle
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table reservations enable row level security;
create policy reservations_isolation on reservations
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table clients enable row level security;
create policy clients_isolation on clients
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table service_events enable row level security;
create policy service_events_isolation on service_events
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

-- checklist_entries : données d'audit HACCP, désormais rattachées à un restaurant.
create policy checklist_entries_isolation on checklist_entries
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

-- checklists / checklist_items : gabarits partagés (pas de restaurant_id), lecture
-- ouverte à tout utilisateur authentifié, écriture réservée à service_role.
alter table checklists enable row level security;
create policy checklists_select on checklists
  for select using (auth.role() = 'authenticated');

alter table checklist_items enable row level security;
create policy checklist_items_select on checklist_items
  for select using (auth.role() = 'authenticated');

-- restaurant_invitations : consultation/gestion réservée aux admins du restaurant.
-- La validation d'un code (POST /invitations/redeem) n'a pas de session utilisateur
-- et passe par service_role côté backend — hors RLS, par conception.
alter table restaurant_invitations enable row level security;
create policy restaurant_invitations_manage on restaurant_invitations
  for all using (is_restaurant_admin(restaurant_id))
  with check (is_restaurant_admin(restaurant_id));

-- users : chacun voit/modifie sa propre fiche, et voit ses coéquipiers de restaurant.
create policy users_select_self on users
  for select using (id = auth.uid());
create policy users_select_teammates on users
  for select using (
    exists (
      select 1
      from restaurant_members mine
      join restaurant_members theirs on theirs.restaurant_id = mine.restaurant_id
      where mine.user_id = auth.uid()
        and mine.actif = true
        and theirs.user_id = users.id
        and theirs.actif = true
    )
  );
create policy users_update_self on users
  for update using (id = auth.uid())
  with check (id = auth.uid());
