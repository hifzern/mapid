import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const point = (coordinates: [number, number], properties: Record<string, string>) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties,
});

const context = {
  study_area: {
    type: "Feature",
    geometry: { type: "MultiPolygon", coordinates: [[[[106.78, -6.23], [106.86, -6.23], [106.86, -6.16], [106.78, -6.16], [106.78, -6.23]]]] },
    properties: { name: "Area Studi Sintetis" },
  },
  existing_routes: { type: "FeatureCollection", features: [{
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[106.79, -6.22], [106.85, -6.17]] },
    properties: { name: "Rute Existing", route_type: "bus" },
  }] },
  population: { type: "FeatureCollection", features: [{
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[106.8, -6.21], [106.82, -6.21], [106.82, -6.19], [106.8, -6.19], [106.8, -6.21]]] },
    properties: { density_band: "high" },
  }] },
  property_go: { type: "FeatureCollection", features: [point([106.81, -6.2], { kategori: "retail" })] },
  public_facilities: { type: "FeatureCollection", features: [point([106.83, -6.19], { kategori: "sekolah" })] },
  truncated: { existing_routes: false, population: false, property_go: false, public_facilities: false },
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

async function mockContext(page: Page) {
  await page.route("**/api/map-context?**", (route) => route.fulfill({ json: context }));
}

test("draws a route and renders verified results", async ({ page }) => {
  await mockContext(page);
  let analysisCalls = 0;
  await page.route("**/api/analyze", (route) => {
    analysisCalls += 1;
    return route.fulfill({ json: analysis });
  });
  await page.route("**/api/insight", (route) => route.fulfill({ json: {
    summary: "Rute menjangkau 59.780 warga dengan overlap 18%.",
    actions: ["Tinjau pergeseran 500 meter ke utara."],
    source: "ai",
  } }));

  await page.goto("/workspace");
  await expect(page.getByText("Area Studi Sintetis")).toBeVisible();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeDisabled();

  await page.locator(".leaflet-draw-draw-polyline").click();
  const map = page.locator(".leaflet-map");
  await map.click({ position: { x: 240, y: 260 } });
  await map.dblclick({ position: { x: 430, y: 190 } });
  await expect(evaluate).toBeEnabled();
  await evaluate.click();

  await expect(page.getByText("86", { exact: true })).toBeVisible();
  await expect(page.getByText("59.780", { exact: true })).toBeVisible();
  await expect(page.getByText(/Rute menjangkau 59.780 warga/)).toBeVisible();
  await expect(page.getByText("Tinjau pergeseran 500 meter ke utara.")).toBeVisible();
  await expect(page.getByText("POPULASI/KM", { exact: true })).toBeVisible();
  await expect(page.getByText("BUFFER", { exact: true })).toBeVisible();
  await expect(page.getByText("JALAN", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /Terapkan Rekomendasi/ }).click();
  await expect.poll(() => analysisCalls).toBe(2);
  await expect(page.getByText("86", { exact: true })).toBeVisible();
});

test("keeps unsupported controls truthful and map controls functional", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");

  await expect(page.getByRole("button", { name: "Scenario A" })).toHaveAttribute("aria-pressed", "true");
  for (const name of ["Scenario B", "Duplikat", "Ekspor", "Select", "Edit Route", "Undo", "Redo"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  }
  await expect(page.getByText("Unsaved")).toHaveCount(0);
  await expect(page.getByText("Sesi lokal")).toBeVisible();
  await expect(page.getByRole("link", { name: "Metodologi" })).toHaveAttribute("href", "/#metodologi");

  await expect(page.getByRole("button", { name: "Perbesar" })).toBeEnabled();
  await page.getByRole("button", { name: "Perbesar" }).click();
  await expect(page.getByRole("button", { name: "Sesuaikan tampilan" })).toBeEnabled();
  await page.getByRole("button", { name: "Sesuaikan tampilan" }).click();
});

test("shows loading error and allows retry", async ({ page }) => {
  await mockContext(page);
  let attempts = 0;
  let releaseFailure: (() => void) | undefined;
  await page.route("**/api/analyze", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise<void>((resolve) => { releaseFailure = resolve; });
      return route.fulfill({ status: 503, json: { error: "Layanan analisis tidak tersedia." } });
    }
    return route.fulfill({ json: analysis });
  });
  await page.route("**/api/insight", (route) => route.fulfill({ json: { summary: "Ringkasan.", actions: [], source: "template" } }));

  await page.goto("/workspace");
  await page.getByRole("button", { name: "Load Demo Route" }).click();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await evaluate.click();
  await expect(page.getByText("Menghitung konteks rute…")).toBeVisible();
  releaseFailure?.();
  await expect(page.locator(".result-error")).toContainText("Layanan analisis tidak tersedia.");
  await expect(evaluate).toBeEnabled();
  await evaluate.click();
  await expect(page.getByText("86", { exact: true })).toBeVisible();
});

test("landing and workspace remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Evaluator Aksesibilitas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transit", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Coba Demo/ })).toHaveAttribute("href", "/workspace");
  await page.getByRole("link", { name: /Buka workspace/ }).last().click();

  await expect(page.locator(".leaflet-map")).toBeVisible();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeDisabled();
  await page.getByRole("button", { name: "Load Demo Route" }).click();
  await expect(evaluate).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
