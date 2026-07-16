begin;

truncate public.study_area, public.existing_routes, public.population_grid,
  public.property_go restart identity;

insert into public.study_area (name, source, geom) values (
  'Synthetic Study Area',
  'test',
  extensions.st_multi(
    extensions.st_makeenvelope(106.78, -6.23, 106.84, -6.16, 4326)
  )
);

update public.scoring_config
set buffer_meters = 500,
    overlap_tolerance_meters = 50,
    population_per_km_target = 1000,
    population_weight = 0.625,
    overlap_weight = 0.375
where id = true;

insert into public.population_grid (admin_name, population, source, geom) values
  (
    'Covered',
    1000,
    'test',
    extensions.st_multi(extensions.st_makeenvelope(106.802, -6.201, 106.808, -6.199, 4326))
  ),
  (
    'Outside',
    5000,
    'test',
    extensions.st_multi(extensions.st_makeenvelope(107.5, -6.2, 107.51, -6.19, 4326))
  );

insert into public.property_go (kategori, jenis, alamat, source, geom) values
  ('Ruko', 'Sewa', 'Restricted fixture address', 'test',
   extensions.st_setsrid(extensions.st_point(106.805, -6.2), 4326));

do $$
declare
  v_route jsonb := '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}';
  v_result jsonb := public.analyze_route(v_route);
begin
  if (v_result #>> '{baseline,population_covered}')::bigint not between 990 and 1000 then
    raise exception 'unexpected covered population: %',
      v_result #>> '{baseline,population_covered}';
  end if;
  if (v_result #>> '{baseline,population_per_km}')::numeric not between 890 and 920 then
    raise exception 'unexpected population per km: %',
      v_result #>> '{baseline,population_per_km}';
  end if;
  if (v_result #>> '{baseline,overlap_pct}')::numeric <> 0 then
    raise exception 'route unexpectedly overlaps existing routes';
  end if;
  if (v_result #>> '{baseline,property_go_count}')::integer <> 1 then
    raise exception 'property count should be 1';
  end if;

  begin
    perform public.analyze_route('{"type":"Point","coordinates":[106.8,-6.2]}'::jsonb);
    raise exception 'Point input was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.analyze_route(
      '{"type":"LineString","coordinates":[[107.0,-6.2],[107.01,-6.2]]}'::jsonb
    );
    raise exception 'out-of-area route was accepted';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

set local role anon;

do $$
declare
  v_result jsonb := public.analyze_route(
    '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}'::jsonb
  );
begin
  if v_result #>> '{baseline,score}' is null then
    raise exception 'anon could not call the aggregate RPC';
  end if;

  begin
    perform 1 from public.population_grid limit 1;
    raise exception 'anon could read restricted population rows';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform private.analyze_route(
      '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}'::jsonb
    );
    raise exception 'anon could execute a private helper';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

insert into public.existing_routes (name, route_type, source, geom)
values (
  'Same route',
  'bus',
  'test',
  private.route_from_geojson(
    '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}'::jsonb
  )
);

do $$
declare
  v_result jsonb := public.analyze_route(
    '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}'::jsonb
  );
begin
  if (v_result #>> '{baseline,overlap_pct}')::numeric < 99 then
    raise exception 'full overlap was not detected: %',
      v_result #>> '{baseline,overlap_pct}';
  end if;
end;
$$;

truncate public.existing_routes, public.population_grid;

insert into public.population_grid (admin_name, population, source, geom) values (
  'North target',
  1000,
  'test',
  extensions.st_multi(extensions.st_makeenvelope(106.802, -6.190, 106.808, -6.187, 4326))
);

do $$
declare
  v_route jsonb := '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}';
  v_first jsonb := public.analyze_route(v_route);
  v_second jsonb := public.analyze_route(v_route);
begin
  if v_first <> v_second then
    raise exception 'alignment result is not deterministic';
  end if;
  if v_first -> 'recommendation' is null
    or v_first -> 'recommendation' = 'null'::jsonb
  then
    raise exception 'expected an improving alignment';
  end if;
  if v_first #>> '{recommendation,direction}' <> 'north' then
    raise exception 'expected north alignment, received %',
      v_first #>> '{recommendation,direction}';
  end if;
end;
$$;

truncate public.population_grid;

do $$
declare
  v_result jsonb := public.analyze_route(
    '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}'::jsonb
  );
begin
  if v_result -> 'recommendation' <> 'null'::jsonb then
    raise exception 'a non-improving alignment was recommended';
  end if;
end;
$$;

insert into public.population_grid (admin_name, population, source, geom) values (
  'Visible population',
  12345,
  'test',
  extensions.st_multi(extensions.st_makeenvelope(106.80, -6.21, 106.81, -6.20, 4326))
);
insert into public.property_go (kategori, jenis, alamat, source, geom) values (
  'Rumah', 'Jual', 'Must not leak', 'test',
  extensions.st_setsrid(extensions.st_point(106.805, -6.205), 4326)
);

do $$
declare
  v_context jsonb := public.get_map_context('[106.79,-6.22,106.82,-6.18]'::jsonb);
  v_text text := v_context::text;
begin
  if v_context #>> '{study_area,properties,name}' <> 'Synthetic Study Area' then
    raise exception 'study area name missing from map context';
  end if;
  if v_text like '%Must not leak%' or v_text like '%12345%' then
    raise exception 'restricted map attributes leaked';
  end if;
end;
$$;

rollback;
