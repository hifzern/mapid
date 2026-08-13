-- Synthetic development data only. Do not deploy this seed for competition release.
truncate public.study_area, public.existing_routes, public.population_grid,
  public.property_go, public.public_facilities restart identity;

insert into public.study_area (name, source, geom) values (
  'Kabupaten Kulon Progo (Sintetis)',
  'synthetic-development-seed',
  extensions.st_multi(extensions.st_makeenvelope(110.00, -7.95, 110.32, -7.58, 4326))
);

update public.scoring_config
set population_per_km_target = 5000,
    facility_count_target = 5,
    population_weight = 0.500,
    facility_weight = 0.250,
    overlap_weight = 0.250
where id = true;

insert into public.existing_routes (name, route_type, source, geom) values
  ('Koridor Wates-Sentolo (Sintetis)', 'bus', 'synthetic-development-seed',
   private.route_from_geojson('{"type":"LineString","coordinates":[[110.05,-7.89],[110.10,-7.86],[110.16,-7.86],[110.24,-7.80]]}')),
  ('Koridor Wates-Nanggulan (Sintetis)', 'angkot', 'synthetic-development-seed',
   private.route_from_geojson('{"type":"LineString","coordinates":[[110.08,-7.75],[110.13,-7.80],[110.16,-7.86],[110.20,-7.89]]}'));

insert into public.population_grid (admin_name, population, source, geom) values
  ('Kecamatan Wates', 18000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(110.04,-7.91,110.10,-7.84,4326))),
  ('Kecamatan Wates', 26000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(110.10,-7.91,110.17,-7.82,4326))),
  ('Kecamatan Sentolo', 15000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(110.17,-7.88,110.25,-7.78,4326))),
  ('Kecamatan Nanggulan', 11000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(110.08,-7.80,110.16,-7.70,4326)));

insert into public.property_go (kategori, jenis, alamat, source, geom) values
  ('Hunian', 'Jual', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.09,-7.87),4326)),
  ('Komersial', 'Sewa', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.14,-7.85),4326)),
  ('Hunian', 'Jual', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.20,-7.82),4326));

insert into public.public_facilities (name, kategori, source, geom) values
  ('Stasiun Wates (Sintetis)', 'lainnya', 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.12,-7.86),4326)),
  ('Pasar Wates (Sintetis)', 'pasar', 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.13,-7.85),4326)),
  ('RSUD Wates (Sintetis)', 'rumah_sakit', 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(110.10,-7.88),4326));

update public.public_data_sources
set provider = 'synthetic-development-seed',
    license = 'Development fixture only',
    update_date = current_date,
    status = 'demo'
where source_key in ('study_area', 'existing_routes', 'population', 'property_go', 'public_facilities');
