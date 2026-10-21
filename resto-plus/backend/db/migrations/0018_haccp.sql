-- Checklists HACCP branchées sur Supabase.
--
-- 1. Chaque établissement a son propre plan HACCP : les checklists (gabarits) étaient
--    partagées par toute la base (0001, 0006) ; elles appartiennent désormais à un
--    restaurant et à un département (la cuisine, en général).
-- 2. Un relevé fait foi lors d'un contrôle sanitaire : il garde l'heure à laquelle il a
--    été fait sur le téléphone (même hors ligne), sa journée de service, la conformité
--    et le commentaire. Il n'est jamais modifié ni supprimé par l'app ; le journal
--    d'audit en garde aussi la trace (catégorie HACCP, 5 ans).

-- ─── 1. Gabarits par établissement ───────────────────────────────────────────────
alter table checklists
  add column restaurant_id uuid not null references restaurants(id) on delete cascade,
  add column departement text not null default 'cuisine',
  add column ordre smallint not null default 0,
  add column actif boolean not null default true,
  add constraint checklists_departement_fk foreign key (restaurant_id, departement)
    references departements(restaurant_id, type);
alter table checklists rename column type to nom;
create index checklists_restaurant_idx on checklists(restaurant_id);

alter table checklist_items
  alter column checklist_id set not null,
  add column ordre smallint not null default 0;

-- Lecture réservée aux membres de l'établissement (au lieu de tout utilisateur connecté).
drop policy checklists_select on checklists;
create policy checklists_lecture on checklists
  for select using (is_restaurant_member(restaurant_id));
drop policy checklist_items_select on checklist_items;
create policy checklist_items_lecture on checklist_items
  for select using (exists (
    select 1 from checklists c where c.id = checklist_items.checklist_id and is_restaurant_member(c.restaurant_id)
  ));

-- ─── 2. Relevés ──────────────────────────────────────────────────────────────────
alter table checklist_entries
  alter column restaurant_id set not null,
  alter column checklist_id set not null,
  alter column item_id set not null,
  add column releve_at timestamptz not null default now(),
  add column date_service date,
  add column conforme boolean,
  add column commentaire text;

create or replace function checklist_entries_dater()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.date_service := public.jour_de_service(new.releve_at, new.restaurant_id);
  return new;
end;
$$;

create trigger checklist_entries_date_service
  before insert on checklist_entries
  for each row execute function checklist_entries_dater();

create index checklist_entries_restaurant_jour_idx on checklist_entries(restaurant_id, date_service);

-- Un relevé ne se modifie ni ne se supprime (sauf suppression de l'établissement).
create or replace function checklist_entries_interdire_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Un relevé HACCP ne peut pas être modifié.';
end;
$$;

create trigger checklist_entries_append_only
  before update on checklist_entries
  for each row execute function checklist_entries_interdire_modification();

revoke execute on function
  public.checklist_entries_dater(),
  public.checklist_entries_interdire_modification()
from public, anon, authenticated;
