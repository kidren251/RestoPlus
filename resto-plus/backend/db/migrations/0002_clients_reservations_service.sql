-- Clients, métadonnées de réservation et suivi horodaté du service.

alter table users
  add column access_role text not null default 'serveur'
  check (access_role in ('manager_admin', 'chef_rang', 'serveur'));

update users
set access_role = 'manager_admin'
where role in ('manager', 'direction');

create table clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  email text,
  preferences text,
  allergies text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

alter table reservations
  add column client_id uuid references clients(id),
  add column source text check (source in ('telephone', 'site', 'email', 'walk_in', 'conciergerie')),
  add column status text not null default 'a_venir' check (status in ('a_venir', 'arrivee', 'installee', 'terminee', 'annulee')),
  add column created_at timestamptz not null default now();

create table service_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id uuid not null references tables_salle(id) on delete cascade,
  type text not null check (type in ('arrivee', 'installation', 'entree_servie', 'plat_servi', 'dessert_servi', 'addition', 'depart', 'note')),
  label text not null,
  occurred_at timestamptz not null default now(),
  actor_id uuid references users(id),
  note text
);

create index reservations_client_id_idx on reservations(client_id);
create index service_events_reservation_id_idx on service_events(reservation_id);
create index service_events_table_id_occurred_at_idx on service_events(table_id, occurred_at desc);