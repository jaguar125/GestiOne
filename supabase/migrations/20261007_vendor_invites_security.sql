-- GestiOne — Accès vendeur sécurisés (invitations à usage unique)
-- À exécuter UNE FOIS dans Supabase › SQL Editor. N'efface aucune donnée :
-- ajoute 3 colonnes à devices_shop et crée 2 tables.

alter table public.devices_shop
  add column if not exists role text,
  add column if not exists vendor_id text,
  add column if not exists device_model text;

-- Invitations : un code par envoi, utilisable une seule fois.
--   kind 'invite' : envoyé sur WhatsApp, valable 15 min
--   kind 'live'   : affiché sur l'écran de l'administrateur, valable 2 min
create table if not exists public.vendor_invites (
  id bigserial primary key,
  shop_id uuid not null references public.shops(id) on delete cascade,
  vendor_id text not null,
  kind text not null check (kind in ('invite', 'live')),
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_device_id text,
  used_device_model text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vendor_invites_shop_vendor on public.vendor_invites (shop_id, vendor_id, created_at desc);
alter table public.vendor_invites enable row level security;

-- Journal de sécurité : connexions, tentatives refusées, appareils retirés.
create table if not exists public.shop_security_events (
  id bigserial primary key,
  shop_id uuid not null references public.shops(id) on delete cascade,
  vendor_id text,
  vendor_name text,
  kind text not null,
  device_model text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists shop_security_events_shop on public.shop_security_events (shop_id, id desc);
alter table public.shop_security_events enable row level security;

-- Rôle de l'appareil déduit du libellé quand la fonction ne le précise pas
-- (create-shop écrit « Administrateur »).
create or replace function public.devices_shop_default_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role is null then
    if new.label like 'Administrateur%' then new.role := 'admin';
    elsif new.label like 'Vendeur%' then new.role := 'vendeur';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists devices_shop_default_role on public.devices_shop;
create trigger devices_shop_default_role before insert or update on public.devices_shop
  for each row execute function public.devices_shop_default_role();

-- Appareils déjà liés : rôle et vendeur retrouvés d'après le libellé.
update public.devices_shop
   set role = case when label like 'Administrateur%' then 'admin' when label like 'Vendeur%' then 'vendeur' end
 where role is null;

update public.devices_shop d
   set vendor_id = v->>'id'
  from public.shop_store s, jsonb_array_elements(s.value) v
 where d.vendor_id is null
   and d.label like 'Vendeur (reconnexion) — %'
   and s.shop_id = d.shop_id and s.key = 'vendors' and jsonb_typeof(s.value) = 'array'
   and lower(trim(v->>'name')) = lower(trim(substring(d.label from length('Vendeur (reconnexion) — ') + 1)));
