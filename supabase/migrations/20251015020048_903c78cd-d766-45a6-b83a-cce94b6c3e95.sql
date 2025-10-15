-- Adicionar novos valores ao enum tire_status se não existirem
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='tire_status' and e.enumlabel='descartado') then
    alter type tire_status add value 'descartado';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='tire_status' and e.enumlabel='dsi') then
    alter type tire_status add value 'dsi';
  end if;
end $$;

-- Flag DSI em contêiner
alter table public.containers
  add column if not exists is_dsi boolean not null default false;

create index if not exists containers_is_dsi_idx on public.containers(is_dsi);

-- índices úteis
create unique index if not exists tires_barcode_uk on public.tires(barcode);
create index if not exists tire_history_tire_created_idx on public.tire_history(tire_id, created_at desc);