-- Bar Manager : espace de données dédié, séparé des autres entreprises GestiOne.
-- Une partition par bar (shop_id) dans bar_store, sauvegardes de nuit à part
-- dans bar_backups (30 jours). Accès uniquement par la fonction « store »
-- (clé service) : aucune lecture possible depuis le navigateur.

create table if not exists public.bar_store (
  shop_id uuid not null references public.shops(id) on delete cascade,
  key text not null check (key ~ '^(tomb:)?bar[A-Z][A-Za-z]*$'),
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (shop_id, key)
);
alter table public.bar_store enable row level security;
revoke all on public.bar_store from anon, authenticated;

create table if not exists public.bar_backups (
  id bigserial primary key,
  shop_id uuid not null references public.shops(id) on delete cascade,
  day date not null,
  data jsonb not null,
  size_bytes integer,
  summary jsonb,
  created_at timestamptz not null default now(),
  unique (shop_id, day)
);
alter table public.bar_backups enable row level security;
revoke all on public.bar_backups from anon, authenticated;

-- Fusion par identifiant (même principe que merge_store_list) : une vente faite
-- sur un téléphone ne disparaît jamais parce qu'un autre appareil a envoyé sa
-- liste juste après.
create or replace function public.merge_bar_list(p_shop uuid, p_key text, p_value jsonb, p_deleted jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  cur jsonb; tomb jsonb; tomb_arr text[]; inc_ids text[]; merged jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('bar:' || p_shop::text || ':' || p_key));
  select value into cur from bar_store where shop_id = p_shop and key = p_key for update;
  select value into tomb from bar_store where shop_id = p_shop and key = 'tomb:' || p_key;
  tomb := coalesce(tomb, '[]'::jsonb);
  if p_deleted is not null and jsonb_typeof(p_deleted) = 'array' and jsonb_array_length(p_deleted) > 0 then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into tomb from (
      select x from (select jsonb_array_elements_text(tomb) x union select jsonb_array_elements_text(p_deleted) x) u limit 50000
    ) t;
    insert into bar_store (shop_id, key, value, updated_at) values (p_shop, 'tomb:' || p_key, tomb, now())
      on conflict (shop_id, key) do update set value = excluded.value, updated_at = now();
  end if;
  select coalesce(array_agg(x), '{}') into tomb_arr from jsonb_array_elements_text(tomb) x;
  if jsonb_typeof(cur) is distinct from 'array' then cur := '[]'::jsonb; end if;
  select coalesce(array_agg(e->>'id'), '{}') into inc_ids
    from jsonb_array_elements(p_value) e where not ((e->>'id') = any(tomb_arr));
  with incs as (
    select e, o from jsonb_array_elements(p_value) with ordinality a(e, o) where not ((e->>'id') = any(tomb_arr))
  ), ext as (
    select e, 1000000 + o as o from jsonb_array_elements(cur) with ordinality b(e, o)
    where (e->>'id') is not null and not ((e->>'id') = any(inc_ids)) and not ((e->>'id') = any(tomb_arr))
  ), allr as (select * from incs union all select * from ext)
  select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into merged from allr;
  insert into bar_store (shop_id, key, value, updated_at) values (p_shop, p_key, merged, now())
    on conflict (shop_id, key) do update set value = excluded.value, updated_at = now();
  return merged;
end $function$;

create or replace function public.snapshot_bar(p_shop_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_data jsonb; v_size integer;
begin
  select jsonb_object_agg(key, value), sum(pg_column_size(value))::int into v_data, v_size
    from public.bar_store where shop_id = p_shop_id and key not like 'tomb:%';
  if v_data is null then return; end if;
  insert into public.bar_backups (shop_id, day, data, size_bytes, summary)
  values (p_shop_id, (now() at time zone 'utc')::date, v_data, v_size, jsonb_build_object(
    'sales', case when jsonb_typeof(v_data->'barSales') = 'array' then jsonb_array_length(v_data->'barSales') else 0 end,
    'products', case when jsonb_typeof(v_data->'barProducts') = 'array' then jsonb_array_length(v_data->'barProducts') else 0 end,
    'sessions', case when jsonb_typeof(v_data->'barSessions') = 'array' then jsonb_array_length(v_data->'barSessions') else 0 end))
  on conflict (shop_id, day) do update set data = excluded.data, size_bytes = excluded.size_bytes, summary = excluded.summary, created_at = now();
end $function$;

-- Sauvegarde de nuit (tâche « gestione-nightly-backup », 03:00 UTC) : les bars en plus.
create or replace function public.snapshot_all_shops()
returns void language plpgsql security definer set search_path to 'public' as $function$
declare r record;
begin
  for r in select distinct shop_id from public.shop_store loop
    begin perform public.snapshot_shop(r.shop_id);
    exception when others then raise warning 'snapshot_shop % failed: %', r.shop_id, sqlerrm; end;
  end loop;
  for r in select distinct shop_id from public.bar_store loop
    begin perform public.snapshot_bar(r.shop_id);
    exception when others then raise warning 'snapshot_bar % failed: %', r.shop_id, sqlerrm; end;
  end loop;
  delete from public.shop_backups where day < (now() at time zone 'utc')::date - 30;
  delete from public.bar_backups where day < (now() at time zone 'utc')::date - 30;
end $function$;

revoke all on function public.merge_bar_list(uuid, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.snapshot_bar(uuid) from public, anon, authenticated;

-- Reprise des données Bar Manager déjà envoyées dans shop_store.
insert into public.bar_store (shop_id, key, value, updated_at)
  select shop_id, key, value, updated_at from public.shop_store where key ~ '^(tomb:)?bar[A-Z][A-Za-z]*$'
  on conflict (shop_id, key) do nothing;
delete from public.shop_store where key ~ '^(tomb:)?bar[A-Z][A-Za-z]*$';
