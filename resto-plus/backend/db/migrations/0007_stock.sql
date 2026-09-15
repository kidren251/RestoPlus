-- Gestion des stocks cuisine : catalogue d'ingrédients + journal des mouvements.
-- Suit le même schéma d'isolation par restaurant que 0003/0006 : colonne
-- restaurant_id + policy RLS s'appuyant sur is_restaurant_member (définie en 0006).

create table stock_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  nom text not null,
  categorie text,
  unite text not null check (unite in ('kg', 'g', 'l', 'ml', 'unite')),
  quantite_actuelle numeric not null default 0 check (quantite_actuelle >= 0),
  seuil_alerte numeric not null default 0 check (seuil_alerte >= 0),
  updated_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id),
  type text not null check (type in ('reception', 'sortie', 'perte', 'ajustement')),
  quantite numeric not null check (quantite >= 0),
  quantite_apres numeric not null check (quantite_apres >= 0),
  motif text,
  actor_id uuid references users(id),
  occurred_at timestamptz not null default now()
);

create index stock_items_restaurant_idx on stock_items(restaurant_id);
create index stock_movements_stock_item_id_occurred_at_idx on stock_movements(stock_item_id, occurred_at desc);
create index stock_movements_restaurant_idx on stock_movements(restaurant_id);

alter table stock_items enable row level security;
create policy stock_items_isolation on stock_items
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table stock_movements enable row level security;
create policy stock_movements_isolation on stock_movements
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));
