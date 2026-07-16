# Transit Accessibility Evaluator — MVP Plan

## Goal

Deliver a public WebGIS where a user draws a proposed transit route, receives a transparent accessibility score calculated from real spatial data, sees a better-aligned alternative, and gets a short Indonesian AI explanation based only on verified results.

## Fixed Constraints

- Use MAPID MAPS as the primary basemap and at least one permitted MAPID dataset.
- Keep access public; do not add login, personal history, queues, or real-time collaboration.
- Run buffers, intersections, distances, and scores in PostGIS—not in the LLM.
- Keep requests synchronous: draw route, evaluate, and return the result.
- Never publish restricted raw competition data or expose service credentials.

## Delivery Phases

### 0. Confirm Scope and Data

- Choose one study area and inventory the available route, population, road, and MAPID datasets.
- Record each dataset's source, license, geometry type, CRS, freshness, and import restrictions.
- Confirm MAPID API access, Supabase ownership, deployment accounts, and the LLM provider.
- Lock the score formula and normalization baseline. If road feasibility is deferred, explicitly renormalize the population and overlap weights to total 100.

**Exit check:** the team can load a small approved sample and calculate one expected result manually.

### 1. Build the Map Shell

- Scaffold one Next.js TypeScript app with only the packages needed for Leaflet and drawing.
- Add responsive navigation, MAPID tiles, layer controls, loading/error states, and a route drawing tool.
- Store the drawn route as GeoJSON and validate that it is a non-empty `LineString` before submission.

**Exit check:** a desktop or mobile user can draw, edit, clear, and submit a route over the MAPID basemap.

### 2. Establish PostGIS Data

- Enable PostGIS and add versioned migrations for `existing_routes`, `population_grid`, `property_go`, and `simulated_routes` only if aggregate storage is needed.
- Transform imported geometries to a consistent SRID and add GiST indexes.
- Keep imports reproducible without committing restricted source files.

**Exit check:** indexed spatial queries return the expected features for the study area.

### 3. Implement the Scoring RPC

- Create one RPC that accepts route GeoJSON, validates it, builds a 500 m buffer, and returns population coverage, route overlap, normalized components, and the 0–100 composite score.
- Define partial-polygon population estimation and overlap percentage precisely in the methodology.
- Add a small native SQL assertion script covering invalid geometry, no overlap, full overlap, and boundary intersections.

**Exit check:** fixture results match hand-calculated expectations and the same input always returns the same score.

### 4. Add Smart Alignment

- Generate only the agreed north, south, east, and west shifts at 300, 500, 800, and 1,000 metres.
- Shift in a suitable metric projection, reuse the scoring function for every candidate, and return only the best improvement plus the baseline.
- Do not recommend a candidate that fails to improve the score.

**Exit check:** a deterministic fixture selects the known best candidate and reports the correct delta.

### 5. Present Results

- Show the composite score, component values, 500 m buffer, baseline route, recommended route, and improvement delta.
- Let the user apply the recommendation and evaluate again.
- Add concise methodology and data-source content; keep aggregate analysis and recommendations focused on data already available.

**Exit check:** the complete draw-to-result flow works without placeholder numbers.

### 6. Add AI Narrative Last

- Create one small FastAPI endpoint after scoring is stable.
- Accept only a typed result payload, instruct the model to use supplied values verbatim, and request short actionable Indonesian output.
- Validate required fields and provide a deterministic template fallback when the provider fails.

**Exit check:** tests prove that displayed numbers come from the RPC payload and a provider failure does not block the score.

### 7. Verify and Release

- Run the production build, linting, SQL assertions, AI payload check, and a manual mobile/desktop happy path.
- Check keyboard access, readable contrast, map attribution, source citations, secret handling, and public no-login access.
- Deploy the frontend to Vercel, database to Supabase, and the single AI endpoint to the chosen host.

**Exit check:** the public URL completes the full flow and satisfies every competition constraint in `PROJECT_BRIEF.md`.

## Suggested Team Split

- **GIS/data:** dataset audit, migrations, scoring, alignment, and methodology validation.
- **Frontend:** map interaction, layers, result visualization, responsiveness, and accessibility.
- **Integration/content:** AI endpoint, deployments, source documentation, and end-to-end verification.

Work can overlap after Phase 0, but merge in phase order. Keep each pull request independently runnable and limited to one exit check.

## Definition of Done

The MVP is complete only when a public user can draw a route, receive a reproducible 0–100 score and actionable alternative from PostGIS, inspect the formula and sources, and read an AI narrative containing no unsupported figures.
