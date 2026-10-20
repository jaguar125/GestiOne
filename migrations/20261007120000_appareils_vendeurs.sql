-- GestiOne — Appareils des vendeurs : un téléphone = une seule ligne.
--
-- 1) Nouvelles colonnes sur devices_shop (rien n'est supprimé, compatible
--    avec les anciennes versions de l'app).
-- 2) Nettoyage unique des doublons déjà créés (ex. Francisca : 9 lignes pour
--    le même téléphone) : les anciennes lignes remplacées par une connexion
--    plus récente sont fusionnées dans la ligne la plus récente.

-- ---------------------------------------------------------------------------
-- 1) Colonnes
-- ---------------------------------------------------------------------------
alter table public.devices_shop
  add column if not exists first_linked_at    timestamptz,
  add column if not exists session_started_at timestamptz,
  add column if not exists session_count      integer not null default 1,
  add column if not exists logged_out_at      timestamptz,
  add column if not exists logout_reason      text,
  add column if not exists device_name        text,
  add column if not exists device_brand       text,
  add column if not exists os_version         text,
  add column if not exists app_kind           text,
  add column if not exists hw_key             text;

alter table public.devices_shop drop constraint if exists devices_shop_logout_reason_check;
alter table public.devices_shop add constraint devices_shop_logout_reason_check
  check (logout_reason is null or logout_reason in ('self', 'admin'));

alter table public.devices_shop drop constraint if exists devices_shop_app_kind_check;
alter table public.devices_shop add constraint devices_shop_app_kind_check
  check (app_kind is null or app_kind in ('app', 'navigateur'));

update public.devices_shop
   set first_linked_at    = coalesce(first_linked_at, linked_at),
       session_started_at = coalesce(session_started_at, linked_at)
 where first_linked_at is null or session_started_at is null;

alter table public.devices_shop alter column first_linked_at set default now();
alter table public.devices_shop alter column session_started_at set default now();

create index if not exists devices_shop_shop_vendor_idx on public.devices_shop (shop_id, vendor_id);
create index if not exists devices_shop_shop_hwkey_idx  on public.devices_shop (shop_id, hw_key) where hw_key is not null;

-- ---------------------------------------------------------------------------
-- 2) Fusion des doublons existants
--
-- Une ligne vendeur est un doublon remplacé quand le même vendeur a une ligne
-- plus récente, liée APRÈS la dernière activité de l'ancienne : l'ancien
-- identifiant n'a donc plus jamais été utilisé (même téléphone, identifiant
-- perdu). On ne touche jamais à deux téléphones utilisés en même temps.
-- ---------------------------------------------------------------------------
with recursive ordered as (
  select d.device_id, d.shop_id, d.vendor_id, d.linked_at, d.last_seen_at,
         row_number() over (partition by d.shop_id, d.vendor_id order by d.linked_at) as rn
    from public.devices_shop d
   where d.role = 'vendeur' and d.vendor_id is not null
),
-- Chaîne : chaque ligne est rattachée à son « groupe » (le premier maillon),
-- tant que la suivante a été liée après la dernière activité de la précédente.
chain as (
  select o.device_id, o.shop_id, o.vendor_id, o.rn, o.linked_at, o.last_seen_at, o.device_id as group_root
    from ordered o where o.rn = 1
  union all
  select n.device_id, n.shop_id, n.vendor_id, n.rn, n.linked_at, n.last_seen_at,
         case when n.linked_at >= coalesce(c.last_seen_at, c.linked_at) then c.group_root else n.device_id end
    from chain c
    join ordered n on n.shop_id = c.shop_id and n.vendor_id = c.vendor_id and n.rn = c.rn + 1
),
groups as (
  select shop_id, vendor_id, group_root,
         min(linked_at) as first_linked,
         count(*)       as sessions,
         (array_agg(device_id order by linked_at desc))[1] as keep_id
    from chain
   group by shop_id, vendor_id, group_root
  having count(*) > 1
),
kept as (
  update public.devices_shop d
     set first_linked_at = g.first_linked,
         session_count   = g.sessions
    from groups g
   where d.shop_id = g.shop_id and d.device_id = g.keep_id
  returning d.device_id
)
delete from public.devices_shop d
 using chain c, groups g
 where d.shop_id = c.shop_id and d.device_id = c.device_id
   and c.shop_id = g.shop_id and c.vendor_id = g.vendor_id and c.group_root = g.group_root
   and d.device_id <> g.keep_id;
