-- Migration initiale — Resto Plus / PalaceOS
-- Socle MVP Phase 1 : Restauration & Bar

create table users (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  role text not null check (role in ('serveur', 'manager', 'extra', 'direction')),
  service text not null check (service in ('restauration', 'hebergement', 'conciergerie', 'spa')),
  created_at timestamptz not null default now()
);

create table salles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  largeur_canvas integer not null,
  hauteur_canvas integer not null
);

create table tables_salle (
  id uuid primary key default gen_random_uuid(),
  salle_id uuid references salles(id) on delete cascade,
  x integer not null,
  y integer not null,
  largeur integer not null,
  hauteur integer not null,
  rotation integer not null default 0,
  forme text not null check (forme in ('ronde', 'carree', 'rectangle')),
  capacite integer not null,
  statut text not null default 'libre' check (statut in ('libre', 'occupee', 'reservee', 'a_nettoyer'))
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references tables_salle(id) on delete cascade,
  nom_client text not null,
  couverts integer not null,
  heure timestamptz not null,
  allergenes text[] default '{}',
  notes text
);

create table checklists (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  frequence text not null check (frequence in ('ouverture', 'fermeture', '4h', 'hebdomadaire'))
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists(id) on delete cascade,
  label text not null,
  requiert_photo boolean not null default false,
  requiert_valeur boolean not null default false
);

create table checklist_entries (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists(id),
  item_id uuid references checklist_items(id),
  user_id uuid references users(id),
  valeur text,
  photo_url text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'valide', 'en_retard')),
  created_at timestamptz not null default now()
);

-- RBAC : row-level security à activer avant la Phase 2 (donnée VIP)
alter table users enable row level security;
alter table checklist_entries enable row level security;
