-- 1.1 Enum de status com DESCARTADO e DSI
do $$
begin
  perform 1
  from pg_type t
  join pg_enum e on t.oid = e.enumtypid
  where t.typname = 'tire_status';
  exception when undefined_object then
    create type tire_status as enum ('estoque','piloto','cup','descartado','dsi');
end $$;

-- se já existe mas falta algum valor, adiciona
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='tire_status' and e.enumlabel='descartado') then
    alter type tire_status add value 'descartado';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='tire_status' and e.enumlabel='dsi') then
    alter type tire_status add value 'dsi';
  end if;
end $$;

alter table public.tires
  alter column status type tire_status using status::tire_status;

-- 1.2 Flag DSI em contêiner
alter table public.containers
  add column if not exists is_dsi boolean not null default false;

create index if not exists containers_is_dsi_idx on public.containers(is_dsi);

-- 1.3 View de contadores para o dashboard
create or replace view public.tires_counts as
select
  count(*) as total,
  count(*) filter (where status = 'estoque') as estoque,
  count(*) filter (where status = 'piloto') as piloto,
  count(*) filter (where status = 'cup') as cup,
  count(*) filter (where status = 'descartado') as descartado,
  count(*) filter (where status = 'dsi') as dsi
from public.tires;

-- 1.4 RPC: scan em contêiner aplicando regra DSI
create or replace function public.scan_into_container(
  p_barcode text,
  p_container_id uuid,
  p_user uuid
) returns json language plpgsql as $$
declare
  v_tire record;
  v_container record;
begin
  select * into v_tire from public.tires where barcode = p_barcode;
  if not found then
    return json_build_object('ok', false, 'code', 'not_found', 'message', 'Pneu não encontrado');
  end if;

  select * into v_container from public.containers where id = p_container_id;
  if not found then
    return json_build_object('ok', false, 'code', 'container_not_found');
  end if;

  if v_container.is_dsi then
    -- bloqueio: pneu em PILOTO não pode entrar em DSI
    if v_tire.status = 'piloto' then
      return json_build_object('ok', false, 'code', 'blocked_piloto_in_dsi', 'message', 'Pneu de PILOTO não pode entrar em contêiner DSI');
    end if;

    -- mover para DSI (retorno ao país de origem)
    update public.tires
       set status = 'dsi', current_location_type = 'none', current_location_id = null
     where id = v_tire.id;

    insert into public.tire_history(
      tire_id, event_type, from_status, to_status, from_location_type,
      to_location_type, to_location_id, performed_by
    ) values (
      v_tire.id, 'load_dsi', v_tire.status, 'dsi', v_tire.current_location_type,
      'none', null, p_user
    );

    return json_build_object('ok', true, 'code', 'ok_dsi');
  else
    -- contêiner normal: muda apenas a localização
    update public.tires
       set current_location_type = 'container',
           current_location_id   = p_container_id
     where id = v_tire.id;

    insert into public.tire_history(
      tire_id, event_type, from_status, to_status, from_location_type,
      to_location_type, to_location_id, performed_by
    ) values (
      v_tire.id, 'scan_container', v_tire.status, v_tire.status, v_tire.current_location_type,
      'container', p_container_id, p_user
    );

    return json_build_object('ok', true, 'code', 'ok_container');
  end if;
end $$;

-- índices úteis (caso não existam)
create unique index if not exists tires_barcode_uk on public.tires(barcode);
create index if not exists tire_history_tire_created_idx on public.tire_history(tire_id, created_at desc);