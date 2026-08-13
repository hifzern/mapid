begin;

truncate public.study_area, public.existing_routes, public.population_grid,
  public.property_go, public.public_facilities restart identity;

insert into public.study_area (name, source, geom) values (
  'Synthetic Study Area',
  'test',
  extensions.st_multi(
    extensions.st_makeenvelope(106.78, -6.23, 106.84, -6.16, 4326)
  )
);

update public.scoring_config
set buffer_meters = 500,
    walking_minutes = 10,
    stop_spacing_meters = 800,
    max_analysis_stops = 30,
    overlap_tolerance_meters = 50,
    overlap_conflict_threshold_pct = 30,
    population_per_km_target = 1000,
    facility_count_target = 1,
    area_population_coverage_target_pct = 50,
    area_facility_count_target = 1,
    population_weight = 0.500,
    facility_weight = 0.250,
    overlap_weight = 0.250
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

insert into public.public_facilities (name, kategori, source, geom) values
  ('Pasar Test', 'pasar', 'test',
   extensions.st_setsrid(extensions.st_point(106.805, -6.2), 4326)),
  ('Sekolah Luar Buffer', 'sekolah', 'test',
   extensions.st_setsrid(extensions.st_point(106.85, -6.2), 4326));

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
  if (v_result #>> '{baseline,facility_count}')::integer <> 1 then
    raise exception 'facility count should be 1, received %',
      v_result #>> '{baseline,facility_count}';
  end if;
  if (v_result #>> '{baseline,facility_score}')::numeric <> 100 then
    raise exception 'facility score should reach its configured target: %',
      v_result #>> '{baseline,facility_score}';
  end if;
  if (v_result #> '{baseline,facilities_by_type}' -> 0 ->> 'kategori') <> 'pasar'
    or (v_result #> '{baseline,facilities_by_type}' -> 0 ->> 'count')::integer <> 1
  then
    raise exception 'unexpected facilities breakdown: %',
      v_result #> '{baseline,facilities_by_type}';
  end if;
  if (v_result #> '{baseline,population_by_area}' -> 0 ->> 'admin_name') <> 'Covered'
    or (v_result #> '{baseline,population_by_area}' -> 0 ->> 'population_covered')::bigint not between 990 and 1000
    or (v_result #> '{baseline,population_by_area}' -> 0 ->> 'score')::numeric <= 0
    or (v_result #> '{baseline,population_by_area}' -> 0 ->> 'coverage_pct')::numeric <= 0
  then
    raise exception 'unexpected per-area coverage: %',
      v_result #> '{baseline,population_by_area}';
  end if;
  if (v_result #>> '{baseline,overlap_conflict}')::boolean <> false then
    raise exception 'conflict flag should be false without overlap';
  end if;
  if v_result #> '{baseline,overlap_geojson}' <> 'null'::jsonb then
    raise exception 'overlap geometry should be null without overlap';
  end if;
  if v_result #>> '{baseline,catchment_method}' <> 'stop_buffer'
    or v_result #>> '{baseline,catchment_provider}' <> 'postgis'
    or (v_result #>> '{baseline,stop_count}')::integer < 2
    or v_result #>> '{baseline,catchment_geojson,type}' not in ('Polygon', 'MultiPolygon')
  then
    raise exception 'fallback stop catchment is invalid: %', v_result -> 'baseline';
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

do $$
declare
  v_route jsonb := '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.2]]}';
  v_stops jsonb := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[106.8,-6.2]},"properties":{}},{"type":"Feature","geometry":{"type":"Point","coordinates":[106.81,-6.2]},"properties":{}}]}';
  v_service jsonb := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[106.799,-6.203],[106.811,-6.203],[106.811,-6.197],[106.799,-6.197],[106.799,-6.203]]]},"properties":{}}]}';
  v_network jsonb := public.analyze_route(
    v_route,
    v_service,
    v_stops,
    'network_isochrone',
    'test_provider'
  );
  v_with_poi numeric;
  v_without_poi numeric;
begin
  if v_network #>> '{baseline,catchment_method}' <> 'network_isochrone'
    or v_network #>> '{baseline,catchment_provider}' <> 'test_provider'
    or (v_network #>> '{baseline,stop_count}')::integer <> 2
  then
    raise exception 'network catchment metadata was not preserved: %',
      v_network -> 'baseline';
  end if;

  begin
    perform public.analyze_route(
      v_route,
      '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[106.78,-6.23],[106.84,-6.23],[106.84,-6.16],[106.78,-6.16],[106.78,-6.23]]]},"properties":{}}]}'::jsonb,
      v_stops,
      'network_isochrone',
      'test_provider'
    );
    raise exception 'oversized external catchment was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  v_with_poi := (public.analyze_route(v_route) #>> '{baseline,score}')::numeric;
  delete from public.public_facilities where name = 'Pasar Test';
  v_without_poi := (public.analyze_route(v_route) #>> '{baseline,score}')::numeric;
  if v_with_poi <= v_without_poi then
    raise exception 'POI impact did not increase the composite score: % <= %',
      v_with_poi, v_without_poi;
  end if;
  insert into public.public_facilities (name, kategori, source, geom) values
    ('Pasar Test', 'pasar', 'test',
     extensions.st_setsrid(extensions.st_point(106.805, -6.2), 4326));
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
  if (v_result #>> '{baseline,overlap_conflict}')::boolean <> true then
    raise exception 'conflict flag should be true on full overlap';
  end if;
  if v_result #> '{baseline,overlap_geojson}' is null
    or (v_result #>> '{baseline,overlap_geojson,type}') not in ('LineString', 'MultiLineString')
  then
    raise exception 'overlap geometry missing on full overlap';
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
  if (v_context #>> '{methodology,walking_minutes}')::integer <> 10
    or (v_context #>> '{methodology,facility_weight}')::numeric <> 0.250
  then
    raise exception 'MVP methodology metadata is incomplete: %',
      v_context -> 'methodology';
  end if;
end;
$$;

rollback;
