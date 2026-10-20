-- Mot de passe personnel de l'éditeur GestiOne (espace propriétaire).
-- Une seule ligne ; uniquement lisible par les fonctions serveur.
create table if not exists public.app_owner_auth (
  id int primary key default 1 check (id = 1),
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_owner_auth enable row level security;
revoke all on public.app_owner_auth from anon, authenticated;
