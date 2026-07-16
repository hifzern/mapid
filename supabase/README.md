# Spatial Backend

Supabase PostgreSQL with PostGIS stores approved study data privately. Clients can execute only two aggregate functions:

- `analyze_route(p_route)` scores a GeoJSON `LineString` and tests the fixed 16-candidate alignment grid.
- `get_map_context(p_bbox)` returns display-safe, viewport-bounded GeoJSON without addresses or raw population values.

## Apply and Check

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/202607170001_backend.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/scoring.sql
```

Import one approved study boundary and the route, population, and Property GO datasets. Then set a documented population-per-route-kilometre target:

```sql
update public.scoring_config
set population_per_km_target = <verified_population_per_km>
where id = true;
```

## Formula

Population inside the clipped 500 m route buffer is estimated by each polygon's intersected-area fraction. Existing-route overlap is the proposed route length inside a 100 m corridor around existing routes.

```text
population_per_km = population_covered / route_length_km
population_score = min(100, population_per_km / population_per_km_target * 100)
score = population_score * 0.625 + (100 - overlap_pct) * 0.375
```

Property GO is a contextual count, not a score component. Raw tables have RLS enabled with no client policies; public access is limited to security-definer aggregate functions.
