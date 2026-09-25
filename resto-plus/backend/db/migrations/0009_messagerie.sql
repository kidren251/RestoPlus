-- Messagerie : trois espaces distincts, pas un chat unique.
-- - "annonce" : tableau d'affichage de l'établissement (lecture par tous, écriture
--   réservée à N2/N3 — pas de fil de discussion, pas de réponses).
-- - "canal" : discussion multi-sens au sein d'un pôle (salle ou cuisine),
--   configurable par le N3 de l'établissement.
-- - "dm" : message direct, limité à la ligne hiérarchique directe (appliqué côté
--   API — voir backend/api/src/routes/messaging.ts — jamais entre deux membres du
--   même niveau).

create table conversations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  type text not null check (type in ('annonce', 'canal', 'dm')),
  nom text,
  pole text check (pole in ('salle', 'cuisine')),
  participant_ids uuid[],
  created_at timestamptz not null default now(),
  constraint conversations_dm_has_two_participants
    check (type <> 'dm' or array_length(participant_ids, 1) = 2),
  constraint conversations_canal_has_pole
    check (type <> 'canal' or pole is not null)
);

-- Note : l'émetteur (nom, access_role) n'est pas dupliqué ici, contrairement au mock
-- API — à joindre via restaurant_members/users une fois cette migration exploitée.
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id),
  emetteur_id uuid not null references users(id),
  contenu text not null,
  created_at timestamptz not null default now()
);

create index conversations_restaurant_idx on conversations(restaurant_id);
create index chat_messages_conversation_created_idx on chat_messages(conversation_id, created_at desc);
create index chat_messages_restaurant_idx on chat_messages(restaurant_id);

alter table conversations enable row level security;
create policy conversations_isolation on conversations
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

alter table chat_messages enable row level security;
create policy chat_messages_isolation on chat_messages
  for all using (is_restaurant_member(restaurant_id))
  with check (is_restaurant_member(restaurant_id));

-- Le détail des droits (lecture d'un canal réservée au bon pôle, écriture d'une
-- annonce réservée à N2/N3, DM réservé aux deux participants et à la hiérarchie
-- directe) est appliqué côté API, pas dans ces policies : elles ne posent que
-- l'isolation par restaurant, comme le reste du schéma.
