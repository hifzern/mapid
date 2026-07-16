import { expect, test } from "@playwright/test";

const context = {
  study_area: {
    type: "Feature",
    geometry: { type: "MultiPolygon", coordinates: [[[[106.78, -6.23], [106.86, -6.23], [106.86, -6.16], [106.78, -6.16], [106.78, -6.23]]]] },
    properties: { name: "Area Studi Sintetis" },
  },
  existing_routes: { type: "FeatureCollection", features: [] },
  population: { type: "FeatureCollection", features: [] },
  property_go: { type: "FeatureCollection", features: [] },
  truncated: { existing_routes: false, population: false, property_go: false },
};

const score = {
  score: 86,
  route_length_km: 12.5,
  population_covered: 59780,
  population_per_km: 4782.4,
  population_per_km_target: 5000,
  population_score: 95.65,
  overlap_pct: 18,
  overlap_score: 82,
  property_go_count: 167,
  buffer_geojson: { type: "Polygon", coordinates: [[[106.8, -6.21], [106.84, -6.21], [106.84, -6.18], [106.8, -6.18], [106.8, -6.21]]] },
  formula: { buffer_meters: 500, overlap_tolerance_meters: 100, population_weight: 0.625, overlap_weight: 0.375, population_assumption: "uniform_within_polygon" },
};

const analysis = {
  baseline: score,
  recommendation: {
    direction: "north",
    distance_meters: 500,
    route_geojson: { type: "LineString", coordinates: [[106.8, -6.195], [106.84, -6.185]] },
    score_delta: 4.2,
    population_delta: 3100,
    population_per_km_delta: 248,
    result: { ...score, score: 90.2, population_covered: 62880 },
  },
};

test("draws a route and renders verified results", async ({ page }) => {
  await page.route("**/api/map-context?**", (route) => route.fulfill({ json: context }));
  await page.route("**/api/analyze", (route) => route.fulfill({ json: analysis }));
  await page.route("**/api/insight", (route) => route.fulfill({ json: {
    summary: "Rute menjangkau 59.780 warga dengan overlap 18%.",
    actions: ["Tinjau pergeseran 500 meter ke utara."],
    source: "ai",
  } }));

  await page.goto("/workspace");
  await expect(page.getByText("Area Studi Sintetis")).toBeVisible();
  await page.locator(".leaflet-draw-draw-polyline").click();
  const map = page.locator(".leaflet-map");
  await map.click({ position: { x: 240, y: 260 } });
  await map.dblclick({ position: { x: 430, y: 190 } });

  const evaluate = page.getByRole("button", { name: "Evaluasi rute" });
  await expect(evaluate).toBeEnabled();
  await evaluate.click();

  await expect(page.getByText("86", { exact: true })).toBeVisible();
  await expect(page.getByText("59.780", { exact: true })).toBeVisible();
  await expect(page.getByText(/Rute menjangkau 59.780 warga/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Terapkan/ })).toBeVisible();
});

test("landing and workspace remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Nilai sebuah rute/ })).toBeVisible();
  await page.getByRole("link", { name: /Evaluasi rute/ }).click();
  await expect(page.locator(".leaflet-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Evaluasi rute" })).toBeDisabled();
});
