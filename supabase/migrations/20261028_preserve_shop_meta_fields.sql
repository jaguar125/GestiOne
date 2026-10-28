-- E24 : un appareil qui renvoie une version incomplète des réglages
-- (shopMeta) ne doit plus effacer les champs qu'il ne connaît pas
-- (actionnaires, charges fixes, objectifs…). Les champs absents de la
-- nouvelle version sont repris de l'ancienne ; une valeur explicite
-- (y compris null) est toujours respectée.
create or replace function public.preserve_shop_meta_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.key = 'shopMeta'
     and jsonb_typeof(old.value) = 'object'
     and jsonb_typeof(new.value) = 'object' then
    new.value := old.value || new.value;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preserve_shop_meta on public.shop_store;
create trigger trg_preserve_shop_meta
  before update on public.shop_store
  for each row
  when (new.key = 'shopMeta')
  execute function public.preserve_shop_meta_fields();
