create table public.public_data_sources (
  source_key text primary key,
  dataset_name text not null,
  provider text not null,
  license text not null,
  update_date date,
  status text not null check (status in ('demo', 'provisional', 'verified', 'unavailable')),
  limitation text not null
);

alter table public.public_data_sources enable row level security;
revoke all on public.public_data_sources from anon, authenticated;

insert into public.public_data_sources (
  source_key,
  dataset_name,
  provider,
  license,
  update_date,
  status,
  limitation
) values
  ('study_area', 'Wilayah studi', 'Belum diverifikasi', 'Belum diverifikasi', null, 'demo', 'Geometri sintetis untuk pengembangan; belum disetujui untuk rilis publik.'),
  ('existing_routes', 'Rute angkutan umum eksisting', 'Belum diverifikasi', 'Belum diverifikasi', null, 'demo', 'Rute sintetis; cakupan jaringan dan ketepatan posisi belum diverifikasi.'),
  ('population', 'Grid populasi', 'Belum diverifikasi', 'Belum diverifikasi', null, 'demo', 'Populasi sintetis dan diasumsikan merata di dalam setiap poligon.'),
  ('property_go', 'Property GO', 'Belum diverifikasi', 'Belum diverifikasi', null, 'demo', 'Titik sintetis; atribut pribadi dan alamat tidak ditampilkan.'),
  ('public_facilities', 'Fasilitas publik', 'Belum diverifikasi', 'Belum diverifikasi', null, 'unavailable', 'Dataset publik yang disetujui belum tersedia.'),
  ('basemap', 'MAPID Maps', 'MAPID', 'Belum diverifikasi', null, 'provisional', 'URL tile, lisensi, dan atribusi produksi menunggu persetujuan MAPID.');

create or replace function private.map_context(p_bbox jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_bbox extensions.geometry;
  v_area public.study_area%rowtype;
  v_config public.scoring_config%rowtype;
  v_existing jsonb;
  v_population jsonb;
  v_properties jsonb;
  v_facilities jsonb;
  v_sources jsonb;
  v_existing_count bigint;
  v_population_count bigint;
  v_property_count bigint;
  v_facility_count bigint;
  v_west double precision;
  v_south double precision;
  v_east double precision;
  v_north double precision;
begin
  if p_bbox is null
    or jsonb_typeof(p_bbox) <> 'array'
    or jsonb_array_length(p_bbox) <> 4
  then
    raise exception 'bbox must be [west, south, east, north]' using errcode = '22023';
  end if;

  begin
    v_west := (p_bbox ->> 0)::double precision;
    v_south := (p_bbox ->> 1)::double precision;
    v_east := (p_bbox ->> 2)::double precision;
    v_north := (p_bbox ->> 3)::double precision;
  exception when others then
    raise exception 'bbox must contain four valid numbers' using errcode = '22023';
  end;
  if v_west not between -180 and 180
    or v_east not between -180 and 180
    or v_south not between -90 and 90
    or v_north not between -90 and 90
    or v_west >= v_east or v_south >= v_north
    or v_east - v_west > 5 or v_north - v_south > 5
  then
    raise exception 'bbox is outside allowed limits' using errcode = '22023';
  end if;
  v_bbox := extensions.st_makeenvelope(v_west, v_south, v_east, v_north, 4326);

  select * into v_area from public.study_area where id = true;
  if not found then
    raise exception 'configure one study_area before loading map data' using errcode = '55000';
  end if;
  select * into v_config from public.scoring_config where id = true;

  select count(*) into v_existing_count
  from public.existing_routes where geom operator(extensions.&&) v_bbox;
  select count(*) into v_population_count
  from public.population_grid where geom operator(extensions.&&) v_bbox;
  select count(*) into v_property_count
  from public.property_go where geom operator(extensions.&&) v_bbox;
  select count(*) into v_facility_count
  from public.public_facilities where geom operator(extensions.&&) v_bbox;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'Feature',
    'geometry', extensions.st_asgeojson(geom, 6)::jsonb,
    'properties', jsonb_build_object(
      'id', 'route-' || id,
      'name', name,
      'route_type', route_type
    )
  )), '[]'::jsonb)
  into v_existing
  from (
    select id, name, route_type, geom
    from public.existing_routes
    where geom operator(extensions.&&) v_bbox
    order by id
    limit 5000
  ) routes;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'Feature',
    'geometry', extensions.st_asgeojson(
      extensions.st_intersection(geom, v_bbox), 6
    )::jsonb,
    'properties', jsonb_build_object(
      'id', 'population-' || id,
      'density_band', density_band
    )
  )), '[]'::jsonb)
  into v_population
  from (
    select id, geom, case
      when population / nullif(
        extensions.st_area(geom::extensions.geography) / 1000000.0, 0
      ) < 1000 then 'very_low'
      when population / nullif(
        extensions.st_area(geom::extensions.geography) / 1000000.0, 0
      ) < 5000 then 'low'
      when population / nullif(
        extensions.st_area(geom::extensions.geography) / 1000000.0, 0
      ) < 10000 then 'medium'
      when population / nullif(
        extensions.st_area(geom::extensions.geography) / 1000000.0, 0
      ) < 20000 then 'high'
      else 'very_high'
    end as density_band
    from public.population_grid
    where geom operator(extensions.&&) v_bbox
    order by id
    limit 5000
  ) grids;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'Feature',
    'geometry', extensions.st_asgeojson(geom, 6)::jsonb,
    'properties', jsonb_build_object(
      'id', 'property-' || id,
      'kategori', kategori,
      'label', 'Property GO ' || id
    )
  )), '[]'::jsonb)
  into v_properties
  from (
    select id, kategori, geom
    from public.property_go
    where geom operator(extensions.&&) v_bbox
    order by id
    limit 5000
  ) properties;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'Feature',
    'geometry', extensions.st_asgeojson(geom, 6)::jsonb,
    'properties', jsonb_build_object(
      'id', 'facility-' || id,
      'kategori', kategori,
      'label', name
    )
  )), '[]'::jsonb)
  into v_facilities
  from (
    select id, name, kategori, geom
    from public.public_facilities
    where geom operator(extensions.&&) v_bbox
    order by id
    limit 5000
  ) facilities;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source_key', source_key,
    'dataset_name', dataset_name,
    'provider', provider,
    'license', license,
    'update_date', update_date,
    'status', status,
    'limitation', limitation
  ) order by source_key), '[]'::jsonb)
  into v_sources
  from public.public_data_sources;

  return jsonb_build_object(
    'study_area', jsonb_build_object(
      'type', 'Feature',
      'geometry', extensions.st_asgeojson(v_area.geom, 6)::jsonb,
      'properties', jsonb_build_object('name', v_area.name)
    ),
    'existing_routes', jsonb_build_object('type', 'FeatureCollection', 'features', v_existing),
    'population', jsonb_build_object('type', 'FeatureCollection', 'features', v_population),
    'property_go', jsonb_build_object('type', 'FeatureCollection', 'features', v_properties),
    'public_facilities', jsonb_build_object('type', 'FeatureCollection', 'features', v_facilities),
    'sources', v_sources,
    'methodology', jsonb_build_object(
      'buffer_meters', v_config.buffer_meters,
      'walking_minutes', v_config.walking_minutes,
      'stop_spacing_meters', v_config.stop_spacing_meters,
      'max_analysis_stops', v_config.max_analysis_stops,
      'overlap_tolerance_meters', v_config.overlap_tolerance_meters,
      'overlap_conflict_threshold_pct', v_config.overlap_conflict_threshold_pct,
      'facility_count_target', v_config.facility_count_target,
      'area_population_coverage_target_pct', v_config.area_population_coverage_target_pct,
      'area_facility_count_target', v_config.area_facility_count_target,
      'population_weight', v_config.population_weight,
      'facility_weight', v_config.facility_weight,
      'overlap_weight', v_config.overlap_weight,
      'population_assumption', 'uniform_within_polygon',
      'target_calibration_status', case
        when v_config.population_per_km_target is null then 'unavailable'
        else 'provisional'
      end
    ),
    'truncated', jsonb_build_object(
      'existing_routes', v_existing_count > 5000,
      'population', v_population_count > 5000,
      'property_go', v_property_count > 5000,
      'public_facilities', v_facility_count > 5000
    )
  );
end;
$$;

comment on table public.public_data_sources is
  'Controlled public metadata only; raw imported provenance fields remain private.';
comment on function public.get_map_context(jsonb) is
  'Returns viewport-bounded display-safe GeoJSON plus controlled public provenance and methodology metadata.';
