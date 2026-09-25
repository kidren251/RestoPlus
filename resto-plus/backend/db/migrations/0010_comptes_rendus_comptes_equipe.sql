-- Comptes rendus de service, validation des sorties de stock et comptes équipe permanents.
-- Miroir du prototype en mémoire de l'API (routes comptesRendus.ts, stock.ts, comptes.ts).
-- Droits : matrice partagée packages/types/src/permissions.ts, appliquée par l'API ;
-- la RLS garantit en plus l'isolation par restaurant (même schéma que 0006/0007).

-- 1. Stock : une baisse reste provisoire jusqu'au compte rendu cuisine validé par le N2.
alter table stock_items add column quantite_confirmee numeric not null default 0 check (quantite_confirmee >= 0);
update stock_items set quantite_confirmee = quantite_actuelle;

alter table stock_movements add column delta numeric not null default 0;
alter table stock_movements add column statut text not null default 'confirme'
  check (statut in ('provisoire', 'confirme', 'annule'));

create index stock_movements_provisoires_idx on stock_movements(restaurant_id) where statut = 'provisoire';

-- 2. Journal des plats commandés (source du compte rendu : plats, chiffre d'affaires).
create table commandes_plats (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  menu_item_id uuid not null references menu_items(id),
  table_id text not null,
  quantite integer not null check (quantite > 0),
  prix_vente numeric not null check (prix_vente >= 0), -- figé au moment de la commande
  actor_id uuid references users(id),
  ordered_at timestamptz not null default now()
);
create index commandes_plats_restaurant_ordered_idx on commandes_plats(restaurant_id, ordered_at desc);

-- 3. Comptes rendus validés : le contenu est figé en jsonb au moment de la validation.
create table comptes_rendus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  pole text not null check (pole in ('salle', 'cuisine')),
  date_service date not null,
  periode_debut timestamptz,
  valide_at timestamptz not null default now(),
  valide_par uuid not null references users(id),
  observations text,
  chiffre_affaires_estime numeric not null default 0,
  cout_matiere_estime numeric,
  valeur_pertes numeric,
  contenu jsonb not null -- plats, mouvements de stock confirmés, indicateurs salle
);
create index comptes_rendus_restaurant_valide_idx on comptes_rendus(restaurant_id, valide_at desc);

alter table stock_movements add column compte_rendu_id uuid references comptes_rendus(id);

-- 4. Comptes équipe permanents : créés par le N3, activés par l'employé avec un code.
-- À l'activation, l'API crée l'utilisateur Supabase Auth, renseigne user_id et
-- insère la ligne restaurant_members correspondante.
create table comptes_equipe (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  nom text not null,
  access_role text not null check (access_role in ('serveur', 'chef_rang', 'manager_admin')),
  pole text not null check (pole in ('salle', 'cuisine')),
  statut text not null default 'en_attente_activation'
    check (statut in ('en_attente_activation', 'actif', 'desactive')),
  activation_code_hash text unique, -- sha256 du code, jamais le code en clair
  activation_expires_at timestamptz,
  user_id uuid references users(id),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  constraint comptes_equipe_actif_a_un_utilisateur check (statut <> 'actif' or user_id is not null)
);
create index comptes_equipe_restaurant_idx on comptes_equipe(restaurant_id);

-- 5. Isolation par restaurant.
alter table commandes_plats enable row level security;
create policy commandes_plats_isolation on commandes_plats
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table comptes_rendus enable row level security;
create policy comptes_rendus_isolation on comptes_rendus
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

-- Les codes d'activation (même hachés) ne doivent pas être lisibles par les membres :
-- aucune policy, la table n'est accessible qu'à l'API via la clé service_role.
alter table comptes_equipe enable row level security;
