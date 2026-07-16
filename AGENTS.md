# Repository Guidelines

## Project Structure & Module Organization

Implementation has started with the spatial backend. `PROJECT_BRIEF.md` remains the source of truth for scope, architecture, scoring, and competition constraints. The PDF and extracted `.txt` file contain the official MAPID rules; keep both unchanged.

Database changes live in `supabase/migrations/`, with rollback-only assertions in `supabase/tests/` and usage notes in `supabase/README.md`. Keep the future Next.js application at the repository root (`app/`, `components/`, and `lib/`). Add a small `ai/` FastAPI service only after real scoring data is validated. Do not create extra services, authentication flows, or speculative infrastructure.

## Build, Test, and Development Commands

No frontend package manifest exists yet. Apply the spatial backend with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202607170001_backend.sql`; run its rollback-only assertions with the same command against `supabase/tests/scoring.sql`. Do not assume commands such as `npm test` work until their scripts exist.

## Coding Style & Naming Conventions

Follow generated Next.js and TypeScript defaults: two-space indentation, `PascalCase` React components, `camelCase` functions and variables, and descriptive filenames such as `RouteScorePanel.tsx`. Use `snake_case` for PostgreSQL tables, columns, and RPC functions, matching names such as `existing_routes` and `population_grid`. Follow PEP 8 in the optional Python service. Reuse platform and installed-library features before adding abstractions or dependencies.

## Testing Guidelines

Backend checks use native SQL in `supabase/tests/scoring.sql`; they run in a transaction and roll back fixtures. Every non-trivial scoring change needs one focused assertion covering its edge case. No frontend or AI test framework exists yet; when added, use `*.test.ts(x)` for TypeScript and `test_*.py` for Python.

## Commit & Pull Request Guidelines

This checkout has no usable Git history, so no established commit convention can be inferred. Use short, imperative subjects, for example `Add route overlap RPC`. Keep commits narrowly scoped. Pull requests should explain the user-visible change, list validation performed, link the relevant issue, and include screenshots for map or UI changes. Call out schema migrations and competition-rule implications explicitly.

## Security & Competition Constraints

Never commit API keys, service-role credentials, or raw restricted competition data. Keep secrets in ignored environment files. MAPID MAPS must remain the primary basemap. Compute all spatial figures in PostGIS or explicit algorithms; the LLM may narrate verified results but must never invent or calculate them.
