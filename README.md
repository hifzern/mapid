# Transit Accessibility Evaluator

Public WebGIS for drawing a proposed transit corridor and receiving a transparent PostGIS score, an improving alignment, and an Indonesian AI narrative based only on verified aggregates.

## System

- Next.js serves the landing page, Leaflet workspace, and same-origin API proxy.
- Supabase/PostGIS owns study data, 500 m buffers, population coverage, overlap, and the 16-candidate alignment search.
- FastAPI sends a whitelisted result payload to OpenAI and rejects unsupported numbers.

No login, route history, road score, PDF export, or raw-data endpoint is included.

## Local setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure Supabase using the commands in `supabase/README.md`. `supabase/seed.sql` is synthetic and development-only. Run the AI service only after the scoring RPC is ready:

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

The public release remains blocked until approved MAPID, route, population, Property GO, and study-boundary data replace the synthetic fixtures and the population-per-kilometre target is documented.
