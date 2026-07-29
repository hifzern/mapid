# Transit Accessibility Evaluator

Public WebGIS for drawing a proposed transit corridor and receiving a transparent PostGIS score, an improving alignment, and an Indonesian AI narrative based only on verified aggregates.

## System

- Next.js serves the landing page, attributed OpenStreetMap/MAPID basemap, Leaflet workspace, and same-origin API proxy.
- OSRM turns drawn, edited, dragged, and recommended geometry into road-following routes before evaluation.
- Supabase/PostGIS owns study data, 500 m buffers, population coverage, overlap, and the 16-candidate alignment search.
- FastAPI sends a whitelisted result payload to OpenAI and rejects unsupported numbers.

Workspace route drawing, vertex editing, whole-route dragging, scenarios, undo/redo, and GeoJSON/JSON export are local to the browser session. No login, server persistence, road score, PDF export, share link, or raw-data endpoint is included.

## Local setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Apply `supabase/migrations/` to a PostGIS-enabled Supabase project, then load `supabase/seed.sql` for synthetic development data. Run the AI service only after the scoring RPC is ready:

The workspace uses OpenStreetMap by default. Set `NEXT_PUBLIC_MAPID_TILE_URL` and attribution only when an approved MAPID tile template is available. Verified contextual layers and route analysis require `SUPABASE_ANON_KEY`.
The public OSRM endpoint is suitable for development only. Production should set `OSRM_BASE_URL` to a managed/self-hosted router and `OSRM_PROFILE` to an approved bus-capable profile.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r ai/requirements.txt
uvicorn ai.app:app --reload
```

## Checks

```sh
pnpm lint
pnpm build
pnpm test:e2e
python -m pytest ai
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/scoring.sql
```

## Production release gate

- Import approved Kulon Progo study boundary, existing routes, population, Property GO, and public-facility datasets; do not deploy `supabase/seed.sql` as production data.
- Update every row in `public.public_data_sources` with its provider, license, update date, limitation, and `verified` status only after review.
- Document and approve the population-per-kilometre target, 500 m buffer, overlap tolerance, and score weights. The workspace intentionally labels the calibration provisional until then.
- Configure `SUPABASE_ANON_KEY`; configure MAPID tiles only when an approved URL and attribution are available. OpenStreetMap remains the attributed fallback.
- Configure a production road router with an approved bus profile, service limits, and monitoring; do not depend on the public OSRM demo endpoint.
- Run the browser-to-PostGIS workflow against real Kulon Progo corridors and the SQL scoring checks before release. The AI service is optional because deterministic insight remains available.
- Configure rate limiting and error monitoring at the deployment edge for `/api/map-context`, `/api/analyze`, `/api/route-snap`, and `/api/insight`.

The public release remains blocked until those data and methodology checks are complete.
