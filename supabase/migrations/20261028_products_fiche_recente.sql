-- Fiches produits : la version la plus récente gagne (prix, formules, nom,
-- suppléments…). Un téléphone qui n'a pas encore reçu le nouveau prix ne peut
-- plus remettre l'ancien en enregistrant une vente : seul son mouvement de
-- stock est pris en compte. (Chaque fiche porte « updatedAt », mis à jour par
-- l'application à chaque modification de la fiche.)
CREATE OR REPLACE FUNCTION public.merge_products_3way_v2(p_shop uuid, p_value jsonb, p_deleted jsonb DEFAULT '[]'::jsonb, p_device text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  cur jsonb;
  srv jsonb;
  adj jsonb := '[]'::jsonb;
  e jsonb;
  y jsonb;
  s jsonb;
  pid text;
  r_sb numeric;
  r_stock numeric;
  r_sbb jsonb;
  r_stock_by jsonb;
  fresh boolean;
  base numeric;
  base_by jsonb;
  window_min constant int := 30;
  t_srv numeric;
  t_in numeric;
  ya jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(p_shop::text || ':' || 'products'));
  select value into cur from shop_store where shop_id = p_shop and key = 'products';
  if jsonb_typeof(cur) is distinct from 'array' then cur := '[]'::jsonb; end if;
  select coalesce(jsonb_object_agg(c->>'id', c), '{}'::jsonb) into srv
    from jsonb_array_elements(cur) c where c->>'id' is not null;

  for e in select x from jsonb_array_elements(coalesce(p_value, '[]'::jsonb)) with ordinality t(x, o) order by o loop
    y := e - '_sb' - '_sbb';
    pid := e->>'id';
    s := srv->pid;
    r_sb := null; r_stock := null; r_sbb := null; r_stock_by := null;
    fresh := false;

    if p_device is not null and pid is not null then
      select sb, stock, sbb, stock_by into r_sb, r_stock, r_sbb, r_stock_by from product_stock_sync
        where shop_id = p_shop and device_id = p_device and product_id = pid
          and applied_at > now() - make_interval(mins => window_min);
      fresh := found;
    end if;

    if s is not null and jsonb_typeof(e->'_sb') = 'number' and jsonb_typeof(e->'stock') = 'number'
       and jsonb_typeof(s->'stock') = 'number' then
      base := (e->>'_sb')::numeric;
      if fresh and r_sb = base and r_stock is not null then
        base := r_stock;
      end if;
      y := jsonb_set(y, '{stock}', to_jsonb((s->>'stock')::numeric + (e->>'stock')::numeric - base));
    end if;

    if s is not null and jsonb_typeof(e->'_sbb') = 'object' and jsonb_typeof(e#>'{boutique,stockBy}') = 'object'
       and jsonb_typeof(s#>'{boutique,stockBy}') = 'object' then
      base_by := e->'_sbb';
      if fresh and r_sbb = base_by and jsonb_typeof(r_stock_by) = 'object' then
        base_by := r_stock_by;
      end if;
      y := jsonb_set(y, '{boutique,stockBy}', adj_stock_by(s#>'{boutique,stockBy}', e#>'{boutique,stockBy}', base_by));
    end if;

    if s is not null and s ? 'openingStock' and coalesce(s->>'openingStockDate', '') <> ''
       and s->>'openingStockDate' = e->>'openingStockDate' then
      y := jsonb_set(y, '{openingStock}', s->'openingStock');
    end if;

    if s is not null and coalesce(e->>'openingStockDate', '') <> ''
       and e->>'openingStockDate' is distinct from s->>'openingStockDate'
       and exists (select 1 from cancelled_inventory_periods c
                   where c.shop_id = p_shop and c.opening_date = e->>'openingStockDate') then
      y := y - 'openingStock' - 'openingStockDate';
      if s ? 'openingStock' then y := jsonb_set(y, '{openingStock}', s->'openingStock'); end if;
      if s ? 'openingStockDate' then y := jsonb_set(y, '{openingStockDate}', s->'openingStockDate'); end if;
    end if;

    -- Nouveau : la fiche du serveur est plus récente que celle envoyée →
    -- on garde la fiche du serveur (prix, formules…) avec le stock calculé ci-dessus.
    if s is not null then
      t_srv := case when jsonb_typeof(s->'updatedAt') = 'number' then (s->>'updatedAt')::numeric else 0 end;
      t_in  := case when jsonb_typeof(e->'updatedAt') = 'number' then (e->>'updatedAt')::numeric else 0 end;
      if t_srv > t_in then
        ya := y;
        y := s;
        if ya ? 'stock' then y := jsonb_set(y, '{stock}', ya->'stock'); end if;
        if ya ? 'lots' then y := jsonb_set(y, '{lots}', ya->'lots'); end if;
        if ya ? 'openingStock' then y := jsonb_set(y, '{openingStock}', ya->'openingStock'); end if;
        if ya ? 'openingStockDate' then y := jsonb_set(y, '{openingStockDate}', ya->'openingStockDate'); end if;
        if jsonb_typeof(ya#>'{boutique,stockBy}') = 'object' and jsonb_typeof(y->'boutique') = 'object' then
          y := jsonb_set(y, '{boutique,stockBy}', ya#>'{boutique,stockBy}');
        end if;
      end if;
    end if;

    if p_device is not null and pid is not null and jsonb_typeof(e->'_sb') = 'number' then
      insert into product_stock_sync (shop_id, device_id, product_id, sb, stock, sbb, stock_by, applied_at)
      values (p_shop, p_device, pid, (e->>'_sb')::numeric,
              case when jsonb_typeof(e->'stock') = 'number' then (e->>'stock')::numeric end,
              case when jsonb_typeof(e->'_sbb') = 'object' then e->'_sbb' end,
              case when jsonb_typeof(e#>'{boutique,stockBy}') = 'object' then e#>'{boutique,stockBy}' end,
              now())
      on conflict (shop_id, device_id, product_id) do update
        set sb = excluded.sb, stock = excluded.stock, sbb = excluded.sbb,
            stock_by = excluded.stock_by, applied_at = excluded.applied_at;
    end if;

    adj := adj || jsonb_build_array(y);
  end loop;

  return merge_store_list(p_shop, 'products', adj, p_deleted);
end;
$function$;
