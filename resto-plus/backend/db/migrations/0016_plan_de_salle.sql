-- Plan de salle : ce qu'il manquait au schéma pour brancher les routes salles / tables
-- (backend/api/src/repositories/salles.ts) sur Supabase.

-- 1. Toute salle et toute table appartiennent à un restaurant (0003 l'avait prévu
--    « avant production »).
alter table salles alter column restaurant_id set not null;
alter table tables_salle alter column restaurant_id set not null;
alter table tables_salle alter column salle_id set not null;

-- 2. Tables : nom affiché, zone, positions décimales (le glisser-déposer n'arrondit pas).
alter table tables_salle
  add column nom text,
  add column zone text not null default 'z1',
  alter column x type double precision,
  alter column y type double precision;

-- 3. Éléments de décor (repères visuels : bar, entrée, cuisine, murs).
create table elements_decor (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  salle_id uuid not null references salles(id) on delete cascade,
  type text not null check (type in ('mur', 'bar', 'entree', 'cuisine')),
  x double precision not null,
  y double precision not null,
  largeur integer not null,
  hauteur integer not null,
  rotation integer not null default 0
);
create index elements_decor_salle_idx on elements_decor(salle_id);

alter table elements_decor enable row level security;
create policy elements_decor_lecture on elements_decor
  for select using (is_restaurant_member(restaurant_id));

-- 4. Repas en cours à chaque table : une ligne par table occupée.
-- Contient le nom du client et ses allergies : aucune lecture directe (API seule),
-- même règle que reservations et clients depuis 0013.
create table etat_service_tables (
  table_id uuid primary key references tables_salle(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  client_nom text,
  course text not null default 'aucun' check (course in ('aucun', 'entree', 'plat', 'dessert')),
  dish_status text not null default 'aucun' check (dish_status in ('aucun', 'a_reclamer', 'servi')),
  seated_at timestamptz,
  last_event_at timestamptz not null default now(),
  allergenes text[] not null default '{}',
  allergenes_signales_at timestamptz,
  constraint etat_service_allergenes_signales
    check (cardinality(allergenes) = 0 or allergenes_signales_at is not null)
);
create index etat_service_tables_restaurant_idx on etat_service_tables(restaurant_id);

alter table etat_service_tables enable row level security;

-- 5. Les allergies d'un repas en cours suivent la même règle que celles des
-- réservations (0015) : effacées à l'addition par l'API, et au plus tard à la fin de la
-- journée de service par le passage horaire.
create or replace function effacer_allergenes_services_passes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  m integer;
begin
  update public.reservations set allergenes = '{}', allergenes_signales_at = null
  where cardinality(allergenes) > 0
    and coalesce(date_service, public.jour_de_service(heure, restaurant_id))
        < public.jour_de_service(now(), restaurant_id);
  get diagnostics n = row_count;

  update public.etat_service_tables set allergenes = '{}', allergenes_signales_at = null
  where cardinality(allergenes) > 0
    and public.jour_de_service(last_event_at, restaurant_id)
        < public.jour_de_service(now(), restaurant_id);
  get diagnostics m = row_count;

  return n + m;
end;
$$;
