-- Invitations temporaires d'équipiers, rattachées à un seul univers restaurant.

create table restaurant_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  created_by uuid not null references users(id),
  role text not null default 'serveur' check (role = 'serveur'),
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses = 1),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index restaurant_invitations_restaurant_idx on restaurant_invitations(restaurant_id);
create index restaurant_invitations_expiry_idx on restaurant_invitations(expires_at);