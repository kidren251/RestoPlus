-- Cloisonnement multi-restaurant : chaque donnée métier appartient à un restaurant.

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table restaurant_members (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  access_role text not null check (access_role in ('manager_admin', 'access_admin', 'chef_rang', 'serveur')),
  actif boolean not null default true,
  primary key (restaurant_id, user_id)
);

alter table users add column restaurant_id uuid references restaurants(id);
alter table salles add column restaurant_id uuid references restaurants(id);
alter table tables_salle add column restaurant_id uuid references restaurants(id);
alter table reservations add column restaurant_id uuid references restaurants(id);
alter table clients add column restaurant_id uuid references restaurants(id);
alter table service_events add column restaurant_id uuid references restaurants(id);

create index restaurant_members_user_idx on restaurant_members(user_id);
create index salles_restaurant_idx on salles(restaurant_id);
create index tables_restaurant_idx on tables_salle(restaurant_id);
create index reservations_restaurant_idx on reservations(restaurant_id);
create index clients_restaurant_idx on clients(restaurant_id);
create index service_events_restaurant_idx on service_events(restaurant_id);

-- Étape obligatoire avant production : rendre ces colonnes NOT NULL après rattachement
-- des données existantes, puis activer les policies RLS filtrées par restaurant_id.