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
    properties: { id: "route-1", name: "Rute Existing", route_type: "bus" },
  }] },
  population: { type: "FeatureCollection", features: [{
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[106.8, -6.21], [106.82, -6.21], [106.82, -6.19], [106.8, -6.19], [106.8, -6.21]]] },
    properties: { id: "population-1", density_band: "high" },
  }] },
  property_go: { type: "FeatureCollection", features: [point([106.81, -6.2], { id: "property-1", kategori: "retail", label: "Property GO 1" })] },
  public_facilities: { type: "FeatureCollection", features: [point([106.83, -6.19], { id: "facility-1", kategori: "sekolah", label: "Sekolah Demo" })] },
  sources: [{
    source_key: "study_area",
    dataset_name: "Area studi sintetis",
    provider: "Fixture Playwright",
    license: "Test only",
    update_date: null,
    status: "demo",
    limitation: "Data sintetis untuk regression test.",
  }],
  methodology: {
    buffer_meters: 500,
    overlap_tolerance_meters: 100,
    population_weight: 0.625,
    overlap_weight: 0.375,
    population_assumption: "uniform_within_polygon",
    target_calibration_status: "provisional",
  },
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

async function mockContext(page: Page, fixture = context) {
  await page.route("**/api/map-context?**", (route) => {
    const bbox = new URL(route.request().url()).searchParams.get("bbox")?.split(",").map(Number);
    expect(bbox).toHaveLength(4);
    const [west, south, east, north] = bbox!;
    expect(east - west).toBeLessThanOrEqual(5);
    expect(north - south).toBeLessThanOrEqual(5);
    expect((west + east) / 2).toBeCloseTo(106.82, 1);
    expect((south + north) / 2).toBeCloseTo(-6.2, 1);
    return route.fulfill({ json: fixture });
  });
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

test("selects, inspects, and focuses display-safe map features", async ({ page }) => {
  const contextRequests: number[][] = [];
  page.on("request", (request) => {
    if (!request.url().includes("/api/map-context?")) return;
    contextRequests.push(new URL(request.url()).searchParams.get("bbox")!.split(",").map(Number));
  });
  await mockContext(page);
  await page.goto("/workspace");
  await expect(page.getByText("Area Studi Sintetis")).toBeVisible();

  const map = page.locator(".leaflet-map");
  const featureCases = [
    { selector: ".map-feature-existing-route", tooltip: "Rute Existing · bus" },
    { selector: ".map-feature-population", tooltip: "Kepadatan Tinggi" },
    { selector: ".map-feature-property-go", tooltip: "Property GO 1 · retail" },
    { selector: ".map-feature-public-facility", tooltip: "Sekolah Demo · sekolah" },
  ];

  for (const featureCase of featureCases) {
    const feature = map.locator(featureCase.selector).first();
    await feature.dispatchEvent("click");
    await expect(map.locator(`${featureCase.selector}.map-feature-selected`)).toHaveCount(1);
    await expect(map.locator(".leaflet-tooltip", { hasText: featureCase.tooltip }).last()).toBeVisible();
  }

  await map.getByRole("button", { name: "Perkecil" }).click();
  await map.getByRole("button", { name: "Perkecil" }).click();
  const requestsBeforePointFocus = contextRequests.length;
  await map.locator(".map-feature-public-facility").dispatchEvent("click");
  await expect.poll(() => contextRequests.slice(requestsBeforePointFocus).some(([west, south, east, north]) => (
    west <= 106.83 && east >= 106.83 && south <= -6.19 && north >= -6.19
  ))).toBe(true);
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
  await mockContext(page, {
    ...context,
    truncated: { ...context.truncated, population: true },
  });
  await page.getByRole("link", { name: /Buka workspace/ }).last().click();

  const map = page.locator(".leaflet-map");
  await expect(map).toBeVisible();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeDisabled();
  await page.getByRole("button", { name: "Load Demo Route" }).click();
  await expect(evaluate).toBeEnabled();
  await expect(page.locator(".map-notice")).toContainText("5.000 objek per layer");
  await expect(map.locator(".missing-basemap")).toBeVisible();

  for (const selector of [".map-legend-box", ".map-notice", ".missing-basemap"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await expect(page.getByRole("button", { name: "Perbesar" })).toBeVisible();
  await expect(page.locator(".leaflet-draw-draw-polyline")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
