-- Durcissement de la RLS (revue de sécurité du 2026-09-25).
--
-- Principe retenu : l'app mobile n'utilise Supabase QUE pour l'authentification.
-- Toutes les données passent par l'API Fastify, qui applique la matrice des droits
-- (packages/types/src/permissions.ts), l'appartenance au restaurant et le journal
-- d'audit. La RLS est le filet de sécurité si quelqu'un contourne l'API avec la clé
-- publique (anon) et une session valide :
--   * AUCUNE écriture directe : un N0 ne doit pas pouvoir modifier le stock ou valider
--     un compte rendu en appelant Supabase lui-même ;
--   * lecture directe limitée aux données opérationnelles de son restaurant (utile
--     plus tard pour Supabase Realtime) ;
--   * aucune lecture directe des données sensibles : clients (allergies = données de
--     santé), réservations (noms), messagerie (messages privés), comptes rendus,
--     délégations, commandes.

-- 1. RLS sur toutes les tables, sans exception.
alter table audit_conservation enable row level security; -- aucune policy : API seule

-- 2. Une vue ignore la RLS par défaut (droits de son créateur) : security_invoker.
drop view if exists journees_service;
create view journees_service with (security_invoker = true) as
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

-- 3a. Données opérationnelles : lecture seule pour les membres du restaurant.
drop policy if exists salles_isolation on salles;
create policy salles_lecture on salles for select using (is_restaurant_member(restaurant_id));

drop policy if exists tables_salle_isolation on tables_salle;
create policy tables_salle_lecture on tables_salle for select using (is_restaurant_member(restaurant_id));

drop policy if exists service_events_isolation on service_events;
create policy service_events_lecture on service_events for select using (is_restaurant_member(restaurant_id));

drop policy if exists checklist_entries_isolation on checklist_entries;
create policy checklist_entries_lecture on checklist_entries for select using (is_restaurant_member(restaurant_id));

drop policy if exists stock_items_isolation on stock_items;
create policy stock_items_lecture on stock_items for select using (is_restaurant_member(restaurant_id));

drop policy if exists stock_movements_isolation on stock_movements;
create policy stock_movements_lecture on stock_movements for select using (is_restaurant_member(restaurant_id));

drop policy if exists stock_alerts_isolation on stock_alerts;
create policy stock_alerts_lecture on stock_alerts for select using (is_restaurant_member(restaurant_id));

drop policy if exists menu_items_isolation on menu_items;
create policy menu_items_lecture on menu_items for select using (is_restaurant_member(restaurant_id));

drop policy if exists menu_item_ingredients_isolation on menu_item_ingredients;
create policy menu_item_ingredients_lecture on menu_item_ingredients for select using (exists (
  select 1 from menu_items mi where mi.id = menu_item_ingredients.menu_item_id and is_restaurant_member(mi.restaurant_id)
));

-- 3b. Données sensibles : plus aucun accès direct (API uniquement).
drop policy if exists reservations_isolation on reservations;
drop policy if exists clients_isolation on clients;
drop policy if exists conversations_isolation on conversations;
drop policy if exists chat_messages_isolation on chat_messages;
drop policy if exists commandes_plats_isolation on commandes_plats;
drop policy if exists comptes_rendus_isolation on comptes_rendus;
drop policy if exists delegations_isolation on delegations;

-- 3c. Droits et invitations : modifiés uniquement via l'API (journal d'audit).
drop policy if exists restaurant_members_manage on restaurant_members;
drop policy if exists restaurant_invitations_manage on restaurant_invitations;
create policy restaurant_invitations_lecture on restaurant_invitations for select using (is_restaurant_admin(restaurant_id));
