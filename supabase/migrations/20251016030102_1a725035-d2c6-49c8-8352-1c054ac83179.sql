-- Correção de segurança: adicionar search_path às funções
create or replace function public.scan_into_container(
  p_barcode text,
  p_container_id uuid,
  p_user uuid
) returns json 
language plpgsql
security definer
set search_path = public
as $$
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
    if v_tire.status = 'piloto' then
      return json_build_object('ok', false, 'code', 'blocked_piloto_in_dsi', 'message', 'Pneu de PILOTO não pode entrar em contêiner DSI');
    end if;

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