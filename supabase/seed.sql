-- Synthetic development data only. Do not deploy this seed for competition release.
truncate public.study_area, public.existing_routes, public.population_grid,
  public.property_go restart identity;

insert into public.study_area (name, source, geom) values (
  'Area Studi Sintetis',
  'synthetic-development-seed',
  extensions.st_multi(extensions.st_makeenvelope(106.78, -6.23, 106.86, -6.16, 4326))
);

update public.scoring_config
set population_per_km_target = 5000
where id = true;

insert into public.existing_routes (name, route_type, source, geom) values
  ('Koridor Existing A', 'bus', 'synthetic-development-seed',
   private.route_from_geojson('{"type":"LineString","coordinates":[[106.79,-6.215],[106.845,-6.18]]}')),
  ('Koridor Existing B', 'brt', 'synthetic-development-seed',
   private.route_from_geojson('{"type":"LineString","coordinates":[[106.80,-6.175],[106.85,-6.215]]}'));

insert into public.population_grid (admin_name, population, source, geom) values
  ('Grid A', 14000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(106.795,-6.215,106.815,-6.195,4326))),
  ('Grid B', 21000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(106.815,-6.205,106.835,-6.185,4326))),
  ('Grid C', 9000, 'synthetic-development-seed', extensions.st_multi(extensions.st_makeenvelope(106.835,-6.195,106.855,-6.175,4326)));

insert into public.property_go (kategori, jenis, alamat, source, geom) values
  ('Hunian', 'Jual', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(106.808,-6.202),4326)),
  ('Komersial', 'Sewa', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(106.829,-6.192),4326)),
  ('Hunian', 'Jual', null, 'synthetic-development-seed', extensions.st_setsrid(extensions.st_point(106.844,-6.182),4326));
