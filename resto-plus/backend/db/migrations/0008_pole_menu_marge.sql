-- Séparation salle / cuisine (pôle métier) + lien plat ↔ ingrédients + alertes de
-- seuil + coût d'achat, base de la future équation prix/marge.
--
-- Le pôle ("salle" | "cuisine" | "direction") détermine les espaces visibles par
-- l'équipier (un cuisinier n'a pas accès au plan de salle, un serveur n'a pas accès
-- aux stocks/checklists cuisine). "direction" (N2/N3) voit les deux espaces.
-- Assigné à la création de l'accès (invitation ou fiche membre) par le N3 de
-- l'établissement ; le cadre général relève du niveau N4 (plateforme).

alter table restaurant_members add column pole text check (pole in ('salle', 'cuisine', 'direction'));
update restaurant_members set pole = case
  when access_role in ('manager_admin', 'directeur_admin', 'access_admin') then 'direction'
  else 'salle'
end;
alter table restaurant_members alter column pole set not null;
alter table restaurant_members alter column pole set default 'salle';

alter table restaurant_invitations add column pole text not null default 'salle' check (pole in ('salle', 'cuisine'));

-- Coût d'achat unitaire de l'ingrédient — premier terme de l'équation prix/marge.
alter table stock_items add column prix_achat numeric;

-- Carte : plats vendables, chacun lié à ses ingrédients de stock. Permet la
-- décrémentation automatique du stock à la commande (POST /menu-items/:id/order)
-- et, avec prix_achat + prix_vente, le calcul de marge par plat.
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  nom text not null,
  categorie text,
  prix_vente numeric not null check (prix_vente >= 0),
  updated_at timestamptz not null default now()
);

create table menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id),
  quantite numeric not null check (quantite > 0)
);

create index menu_items_restaurant_idx on menu_items(restaurant_id);
create index menu_item_ingredients_menu_item_idx on menu_item_ingredients(menu_item_id);

-- Alertes de seuil (stock bas / rupture), déclenchées côté API à chaque mouvement
-- qui fait franchir le seuil — destinées au chef de cuisine et à la direction (N2+).
create table stock_alerts (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id),
  niveau text not null check (niveau in ('bas', 'rupture')),
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index stock_alerts_restaurant_idx on stock_alerts(restaurant_id);
create index stock_alerts_stock_item_idx on stock_alerts(stock_item_id);

alter table menu_items enable row level security;
create policy menu_items_isolation on menu_items
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table menu_item_ingredients enable row level security;
create policy menu_item_ingredients_isolation on menu_item_ingredients
  for all using (exists (
    select 1 from menu_items mi where mi.id = menu_item_ingredients.menu_item_id and is_restaurant_member(mi.restaurant_id)
  ))
  with check (exists (
    select 1 from menu_items mi where mi.id = menu_item_ingredients.menu_item_id and is_restaurant_member(mi.restaurant_id)
  ));

alter table stock_alerts enable row level security;
create policy stock_alerts_isolation on stock_alerts
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));
