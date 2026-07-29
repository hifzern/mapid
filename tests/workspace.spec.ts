import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const point = (coordinates: [number, number], properties: Record<string, string>) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties,
});

const context = {
  study_area: {
    type: "Feature",
    geometry: { type: "MultiPolygon", coordinates: [[[[110.05, -7.92], [110.28, -7.92], [110.28, -7.65], [110.05, -7.65], [110.05, -7.92]]]] },
    properties: { name: "Kabupaten Kulon Progo" },
  },
  existing_routes: { type: "FeatureCollection", features: [{
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[110.08, -7.88], [110.23, -7.74]] },
    properties: { id: "route-1", name: "Rute Existing", route_type: "bus" },
  }] },
  population: { type: "FeatureCollection", features: [{
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[110.12, -7.85], [110.16, -7.85], [110.16, -7.81], [110.12, -7.81], [110.12, -7.85]]] },
    properties: { id: "population-1", density_band: "high" },
  }] },
  property_go: { type: "FeatureCollection", features: [point([110.15, -7.83], { id: "property-1", kategori: "retail", label: "Property GO Wates" })] },
  public_facilities: { type: "FeatureCollection", features: [point([110.16, -7.82], { id: "facility-1", kategori: "sekolah", label: "Sekolah Wates" })] },
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
  buffer_geojson: { type: "Polygon", coordinates: [[[110.1, -7.87], [110.22, -7.87], [110.22, -7.78], [110.1, -7.78], [110.1, -7.87]]] },
  formula: { buffer_meters: 500, overlap_tolerance_meters: 100, population_weight: 0.625, overlap_weight: 0.375, population_assumption: "uniform_within_polygon" },
};

const analysis = {
  baseline: score,
  recommendation: {
    direction: "north",
    distance_meters: 500,
    route_geojson: { type: "LineString", coordinates: [[110.1, -7.84], [110.22, -7.8]] },
    score_delta: 4.2,
    population_delta: 3100,
    population_per_km_delta: 248,
    result: { ...score, score: 90.2, population_covered: 62880 },
  },
};

const snapResult = {
  route: { type: "LineString", coordinates: [[110.071, -7.869], [110.12, -7.84], [110.18, -7.82], [110.229, -7.879]] },
  distance_meters: 18_200,
  duration_seconds: 1_420,
  provider: "osrm",
  endpoints: {
    start: { input: [110.07, -7.87], snapped: [110.071, -7.869], distance_meters: 220 },
    end: { input: [110.23, -7.88], snapped: [110.229, -7.879], distance_meters: 90 },
  },
};

async function mockContext(page: Page, fixture = context) {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/route-snap", (route) => route.fulfill({
    status: 503,
    json: { error: "Routing jalan sedang tidak tersedia." },
  }));
  await page.route("**/api/map-context?**", (route) => {
    const bbox = new URL(route.request().url()).searchParams.get("bbox")?.split(",").map(Number);
    expect(bbox).toHaveLength(4);
    const [west, south, east, north] = bbox!;
    expect(east - west).toBeLessThanOrEqual(5);
    expect(north - south).toBeLessThanOrEqual(5);
    expect((west + east) / 2).toBeCloseTo(110.16, 1);
    expect((south + north) / 2).toBeCloseTo(-7.82, 1);
    return route.fulfill({ json: fixture });
  });
}

async function routeScreenPoint(route: Locator) {
  return route.evaluate((element) => {
    const path = element as SVGPathElement;
    for (const ratio of [0.17, 0.27, 0.37, 0.47, 0.57, 0.67, 0.77, 0.87]) {
      const point = path.getPointAtLength(path.getTotalLength() * ratio);
      const screen = point.matrixTransform(path.getScreenCTM()!);
      if (document.elementFromPoint(screen.x, screen.y) === path) return { x: screen.x, y: screen.y };
    }
    throw new Error("No draggable route segment was found");
  });
}

test("draws a route and renders verified results", async ({ page }) => {
  await mockContext(page);
  let analysisCalls = 0;
  let snapCalls = 0;
  await page.route("**/api/analyze", (route) => {
    analysisCalls += 1;
    return route.fulfill({ json: analysis });
  });
  await page.route("**/api/insight", (route) => route.fulfill({ json: {
    summary: "Rute menjangkau 59.780 warga dengan overlap 18%.",
    actions: ["Tinjau pergeseran 500 meter ke utara."],
    source: "ai",
  } }));
  await page.route("**/api/route-snap", (route) => {
    snapCalls += 1;
    return route.fulfill({ json: snapResult });
  });

  await page.goto("/workspace");
  await expect(page.getByText("Kabupaten Kulon Progo").first()).toBeVisible();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeDisabled();

  await page.getByRole("button", { name: /Gambar/ }).click();
  const map = page.locator(".leaflet-map");
  await map.click({ position: { x: 240, y: 260 } });
  await map.dblclick({ position: { x: 430, y: 190 } });
  const roadPreview = page.getByRole("region", { name: "Preview ikuti jalan" });
  await expect(roadPreview).toBeVisible();
  await roadPreview.getByRole("button", { name: "Terapkan" }).click();
  await expect(evaluate).toBeEnabled();
  await evaluate.click();

  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");
  await expect(page.locator(".metric-cell").filter({ hasText: "POPULASI" }).first()).toContainText("59.780");
  await expect(page.getByText(/Rute menjangkau 59.780 warga/)).toBeVisible();
  await expect(page.getByText("Tinjau pergeseran 500 meter ke utara.")).toBeVisible();
  await expect(page.getByText("POPULASI/KM", { exact: true })).toBeVisible();
  await expect(page.getByText("BUFFER", { exact: true })).toBeVisible();
  await expect(page.getByText("JALAN", { exact: true })).toHaveCount(0);
  await expect(page.locator(".result-readiness")).toContainText("belum untuk keputusan publik");

  await page.getByRole("button", { name: /Terapkan Rekomendasi/ }).click();
  await expect.poll(() => analysisCalls).toBe(2);
  await expect.poll(() => snapCalls).toBe(2);
  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");
});

test("selects, inspects, and focuses display-safe map features", async ({ page }) => {
  const contextRequests: number[][] = [];
  page.on("request", (request) => {
    if (!request.url().includes("/api/map-context?")) return;
    contextRequests.push(new URL(request.url()).searchParams.get("bbox")!.split(",").map(Number));
  });
  await mockContext(page);
  await page.goto("/workspace");
  await expect(page.getByText("Kabupaten Kulon Progo").first()).toBeVisible();

  const map = page.locator(".leaflet-map");
  for (const selector of [
    ".map-feature-existing-route",
    ".map-feature-population",
    ".map-feature-property-go",
    ".map-feature-public-facility",
  ]) {
    await expect(map.locator(selector).first()).toBeVisible({ timeout: 15_000 });
  }

  const facility = map.locator(".map-feature-public-facility").first();
  await facility.evaluate((element) => element.setAttribute("data-layer-instance", "stable"));
  await page.waitForTimeout(600);
  const requestsBeforeSelection = contextRequests.length;
  await facility.dispatchEvent("click");
  await expect(map.locator(".map-feature-public-facility.map-feature-selected")).toHaveCount(1);
  await expect(map.locator(".leaflet-tooltip", { hasText: "Sekolah Wates · sekolah" })).toBeVisible();
  await expect(page.locator(".feature-inspector")).toContainText("Sekolah Wates");
  await expect(facility).toHaveAttribute("data-layer-instance", "stable");
  await page.waitForTimeout(500);
  expect(contextRequests).toHaveLength(requestsBeforeSelection);
});

test("keeps scenarios, export, and map controls functional", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");

  await expect(page.getByRole("button", { name: "Rute Simulasi A" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Sesi lokal")).toBeVisible();
  await expect(page.getByRole("link", { name: "Metodologi" })).toHaveAttribute("href", "/#method");

  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  await expect(page.getByRole("button", { name: "Ekspor" })).toBeEnabled();
  await page.getByRole("button", { name: "Buat skenario baru" }).click();
  await expect(page.locator(".scenario-tab")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Evaluasi" })).toBeDisabled();
  await page.locator(".scenario-tab").first().click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor" }).click();
  await page.getByRole("button", { name: /GeoJSON rute/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("rute-simulasi-a.geojson");

  await expect(page.getByRole("button", { name: "Perbesar" })).toBeEnabled();
  await page.getByRole("button", { name: "Perbesar" }).click();
  await expect(page.getByRole("button", { name: "Sesuaikan tampilan" })).toBeEnabled();
  await page.getByRole("button", { name: "Sesuaikan tampilan" }).click();
});

test("persists editable workspace state but not imported overlays", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  await page.locator(".route-name-input").fill("Koridor Wates tersimpan");
  await page.getByRole("checkbox", { name: "Kepadatan penduduk" }).uncheck();

  const overlay = point([110.17, -7.83], { name: "Overlay sementara" });
  await page.locator(".dataset-input").setInputFiles({
    name: "overlay-sementara.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(overlay)),
  });
  await expect(page.getByText("overlay-sementara.geojson", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator(".route-name-input")).toHaveValue("Koridor Wates tersimpan");
  await expect(page.getByRole("button", { name: "Evaluasi" })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "Kepadatan penduduk" })).not.toBeChecked();
  await expect(page.getByText("overlay-sementara.geojson", { exact: true })).toHaveCount(0);
  await expect(page.locator(".score-ring-ws")).toHaveCount(0);
});

test("imports GeoJSON by drop and loads a single line as the editable route", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");

  const polygon = {
    type: "Feature",
    properties: { name: "Zona prioritas" },
    geometry: {
      type: "Polygon",
      coordinates: [[[110.09, -7.9], [110.14, -7.9], [110.14, -7.84], [110.09, -7.84], [110.09, -7.9]]],
    },
  };
  const dataTransfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify(data)], "zona-prioritas.geojson", { type: "application/geo+json" }));
    return transfer;
  }, polygon);
  const mapCanvas = page.locator(".map-canvas");
  await mapCanvas.dispatchEvent("dragenter", { dataTransfer });
  await expect(page.getByText("Lepaskan GeoJSON di peta")).toBeVisible();
  await mapCanvas.dispatchEvent("drop", { dataTransfer });

  await expect(page.getByText("zona-prioritas.geojson", { exact: true })).toBeVisible();
  await expect(page.locator(".map-feature-imported").first()).toBeVisible();

  const activityPoint = point([110.17, -7.83], { name: "Pasar Wates" });
  await page.locator(".dataset-input").setInputFiles({
    name: "titik-aktivitas.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(activityPoint)),
  });
  await expect(page.getByText("titik-aktivitas.geojson", { exact: true })).toBeVisible();
  await expect(page.locator(".map-feature-imported")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "Tampilkan zona-prioritas.geojson" }).uncheck();
  await expect(page.locator(".map-feature-imported")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Tampilkan zona-prioritas.geojson" }).check();
  await expect(page.locator(".map-feature-imported")).toHaveCount(2);
  await page.getByRole("button", { name: "Hapus titik-aktivitas.geojson" }).click();
  await expect(page.getByText("titik-aktivitas.geojson", { exact: true })).toHaveCount(0);

  const route = {
    type: "Feature",
    properties: { name: "Koridor impor" },
    geometry: { type: "LineString", coordinates: [[110.08, -7.88], [110.14, -7.85], [110.2, -7.82]] },
  };
  await page.locator(".dataset-input").setInputFiles({
    name: "koridor-impor.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(route)),
  });

  await expect(page.getByRole("button", { name: "Evaluasi" })).toBeEnabled();
  await expect(page.locator("path.route-draggable").first()).toBeVisible();
  await expect(page.locator(".route-name-input")).toHaveValue("koridor-impor");
});

test("rejects oversized GeoJSON files and feature collections", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");

  const tooManyFeatures = {
    type: "FeatureCollection",
    features: Array.from({ length: 5001 }, (_, index) => point([110.1, -7.8], { id: String(index) })),
  };
  await page.locator(".dataset-input").setInputFiles({
    name: "terlalu-banyak.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify(tooManyFeatures)),
  });
  await expect(page.getByText("FeatureCollection maksimal 5.000 fitur.")).toBeVisible();

  await page.locator(".dataset-input").setInputFiles({
    name: "terlalu-besar.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 32),
  });
  await expect(page.getByText("Ukuran file maksimal 10 MB.")).toBeVisible();
});

test("previews a snapped route before apply and keeps it as one undo step", async ({ page }) => {
  await mockContext(page);
  await page.route("**/api/analyze", (route) => route.fulfill({ json: analysis }));
  await page.route("**/api/insight", (route) => route.fulfill({ json: { summary: "Ringkasan.", actions: [], source: "template" } }));
  let snapCalls = 0;
  await page.route("**/api/route-snap", (route) => {
    snapCalls += 1;
    if (snapCalls > 2) return route.fulfill({ status: 503, json: { error: "Routing jalan sedang tidak tersedia." } });
    return route.fulfill({ json: snapResult });
  });

  await page.goto("/workspace");
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  const routePath = page.locator("path.proposed-route").first();
  const originalPath = await routePath.getAttribute("d");
  await page.getByRole("button", { name: "Evaluasi" }).click();
  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");

  await page.getByRole("button", { name: "Ikuti jalan" }).click();
  const preview = page.getByRole("region", { name: "Preview ikuti jalan" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("18,20 km");
  await expect(preview).toContainText("Endpoint bergeser hingga 220 m");
  await expect(page.locator("path.route-snap-candidate")).toBeVisible();
  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");
  await expect(page.getByRole("button", { name: "Evaluasi" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ikuti jalan" })).toBeDisabled();
  await expect.poll(() => routePath.getAttribute("d")).toBe(originalPath);

  await preview.getByRole("button", { name: "Batalkan" }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.locator("path.route-snap-candidate")).toHaveCount(0);
  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");
  await expect.poll(() => routePath.getAttribute("d")).toBe(originalPath);

  await page.getByRole("button", { name: "Ikuti jalan" }).click();
  await page.getByRole("region", { name: "Preview ikuti jalan" }).getByRole("button", { name: "Terapkan" }).click();
  await expect(page.getByRole("region", { name: "Preview ikuti jalan" })).toHaveCount(0);
  await expect(page.locator(".score-ring-ws")).toHaveCount(0);
  await expect.poll(() => routePath.getAttribute("d")).not.toBe(originalPath);

  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect.poll(() => routePath.getAttribute("d")).toBe(originalPath);
  await page.getByRole("button", { name: "Ikuti jalan" }).click();
  await expect(page.getByText("Routing jalan sedang tidak tersedia.")).toBeVisible();
  await expect.poll(() => routePath.getAttribute("d")).toBe(originalPath);
});

test("validates route snapping requests before calling the provider", async ({ request }) => {
  const response = await request.post("/api/route-snap", {
    data: { route: { type: "LineString", coordinates: [[110.1, -7.8]] } },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: "Rute harus berupa GeoJSON LineString dengan 2–2.000 titik." });
});

test("drags the complete route without changing its shape", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();

  const route = page.locator("path.route-draggable").first();
  await expect(route).toBeVisible();
  const before = (await route.boundingBox())!;
  const start = await routeScreenPoint(route);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 28, start.y + 18, { steps: 4 });
  await expect(route).toHaveClass(/route-dragging/);
  await expect.poll(() => route.evaluate((element) => getComputedStyle(element).opacity)).toBe("0.65");
  await expect.poll(() => route.evaluate((element) => getComputedStyle(element).filter)).not.toBe("none");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(route).not.toHaveClass(/route-dragging/);
  await expect.poll(() => route.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await expect.poll(async () => (await route.boundingBox())!.x).toBeCloseTo(before.x, 0);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 36, start.y + 24, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () => (await route.boundingBox())!.x).toBeGreaterThan(before.x + 30);
  const moved = (await route.boundingBox())!;
  expect(moved.width).toBeCloseTo(before.width, 0);
  expect(moved.height).toBeCloseTo(before.height, 0);

  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect.poll(async () => (await route.boundingBox())!.x).toBeCloseTo(before.x, 0);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 2, start.y + 2);
  await page.mouse.up();
  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect(page.locator("path.route-draggable")).toHaveCount(0);
});

test("edits vertices and inserts a midpoint without enabling whole-route drag", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  const route = page.locator("path.proposed-route").first();
  const originalPath = await route.getAttribute("d");

  await page.getByRole("button", { name: /Edit/ }).click();
  await expect(page.locator("path.proposed-route.route-draggable")).toHaveCount(0);
  await expect(page.getByText(/otomatis dicocokkan kembali ke jalan/)).toBeVisible();

  const handles = page.locator(".leaflet-editing-icon");
  await expect(handles).toHaveCount(11);
  const vertexIndex = await handles.evaluateAll((elements) => elements.findIndex((element) => Number(getComputedStyle(element).opacity) === 1));
  const vertex = handles.nth(vertexIndex);
  const vertexBox = (await vertex.boundingBox())!;
  await page.mouse.move(vertexBox.x + vertexBox.width / 2, vertexBox.y + vertexBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(vertexBox.x + vertexBox.width / 2 + 24, vertexBox.y + vertexBox.height / 2 - 18, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => route.getAttribute("d")).not.toBe(originalPath);
  const reshapedPath = await route.getAttribute("d");
  await expect(page.getByText("6 titik", { exact: true })).toBeVisible();

  const midpointIndex = await handles.evaluateAll((elements) => elements.findIndex((element) => Number(getComputedStyle(element).opacity) < 1));
  const midpoint = handles.nth(midpointIndex);
  const midpointBox = (await midpoint.boundingBox())!;
  await page.mouse.move(midpointBox.x + midpointBox.width / 2, midpointBox.y + midpointBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(midpointBox.x + midpointBox.width / 2 + 20, midpointBox.y + midpointBox.height / 2 + 16, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByText("7 titik", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect(page.getByText("6 titik", { exact: true })).toBeVisible();
  await expect.poll(() => route.getAttribute("d")).toBe(reshapedPath);
});

test("uses a larger whole-route drag threshold for touch", async ({ page }) => {
  await mockContext(page);
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  const route = page.locator("path.route-draggable").first();
  const originalPath = await route.getAttribute("d");
  const start = await routeScreenPoint(route);

  await route.dispatchEvent("pointerdown", { pointerId: 41, pointerType: "touch", button: 0, buttons: 1, clientX: start.x, clientY: start.y });
  await page.evaluate(({ x, y }) => {
    document.dispatchEvent(new PointerEvent("pointermove", { pointerId: 41, pointerType: "touch", buttons: 1, clientX: x + 9, clientY: y }));
    document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 41, pointerType: "touch", button: 0, clientX: x + 9, clientY: y }));
  }, start);
  await expect.poll(() => route.getAttribute("d")).toBe(originalPath);

  await route.dispatchEvent("pointerdown", { pointerId: 42, pointerType: "touch", button: 0, buttons: 1, clientX: start.x, clientY: start.y });
  await page.evaluate(({ x, y }) => {
    document.dispatchEvent(new PointerEvent("pointermove", { pointerId: 42, pointerType: "touch", buttons: 1, clientX: x + 12, clientY: y }));
    document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 42, pointerType: "touch", button: 0, clientX: x + 12, clientY: y }));
  }, start);
  await expect.poll(() => route.getAttribute("d")).not.toBe(originalPath);
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
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await evaluate.click();
  await expect(page.getByText("Menganalisis konteks rute…")).toBeVisible();
  releaseFailure?.();
  await expect(page.locator(".result-error")).toContainText("Layanan analisis tidak tersedia.");
  await expect(evaluate).toBeEnabled();
  await evaluate.click();
  await expect(page.locator(".score-ring-ws strong")).toHaveText("86");
});

test("landing follows the reference flow and runs the demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Evaluator Aksesibilitas Transit", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cara kerja" })).toHaveAttribute("href", "#how");
  await expect(page.getByRole("link", { name: "Workspace", exact: true })).toHaveAttribute("href", "/workspace");

  await page.getByRole("button", { name: /Coba Demo/ }).click();
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeVisible();
  await evaluate.click();
  await expect(page.getByText("Menghitung buffer 500 m dan overlay data...")).toBeVisible();
  await expect(page.getByText("59.780 warga")).toBeVisible({ timeout: 5_000 });
});

test("landing and workspace remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Evaluator Aksesibilitas Transit" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Buka Workspace/ }).first()).toHaveAttribute("href", "/workspace");
  await mockContext(page, {
    ...context,
    truncated: { ...context.truncated, population: true },
  });
  await page.getByRole("link", { name: /Buka Workspace/ }).first().click();

  const map = page.locator(".leaflet-map");
  await expect(map).toBeVisible({ timeout: 15_000 });
  const evaluate = page.getByRole("button", { name: "Evaluasi" });
  await expect(evaluate).toBeDisabled();
  await page.getByRole("button", { name: "Muat rute contoh Wates" }).click();
  await expect(evaluate).toBeEnabled();
  await expect(page.locator(".map-notice")).toContainText("5.000 objek per layer");
  await expect(page.locator(".readiness-badge")).toHaveText("Provisional");

  for (const selector of [".map-legend-box", ".map-notice"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await expect(page.getByRole("button", { name: "Perbesar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Gambar/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
