-- Photos des pièces d'identité des clients d'hôtel (CNI, permis, passeport).
-- Une ligne par photo, isolée par entreprise. Accès uniquement par la
-- fonction « hotel-photos » (clé de service) : aucune lecture publique.
-- Conservation : 12 mois (purge automatique par la fonction).
create table if not exists public.hotel_guest_photos (
  id text primary key,
  shop_id uuid not null references public.shops(id) on delete cascade,
  guest_id text not null,
  side text not null,
  data text not null,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists hotel_guest_photos_shop_guest on public.hotel_guest_photos (shop_id, guest_id);
create index if not exists hotel_guest_photos_shop_created on public.hotel_guest_photos (shop_id, created_at);
alter table public.hotel_guest_photos enable row level security;
revoke all on public.hotel_guest_photos from anon, authenticated;
