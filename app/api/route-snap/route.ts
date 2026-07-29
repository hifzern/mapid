import { NextResponse } from "next/server";
import { isLineString, type LineString, type Position, type SnapEndpoint } from "@/lib/types";

const MAX_WAYPOINTS = 50;

function sampleRoute(route: LineString) {
  if (route.coordinates.length <= MAX_WAYPOINTS) return route.coordinates;
  return Array.from({ length: MAX_WAYPOINTS }, (_, index) => (
    route.coordinates[Math.round(index * (route.coordinates.length - 1) / (MAX_WAYPOINTS - 1))]
  ));
}

function snapEndpoint(input: Position, waypoint: { distance?: number; location?: unknown } | undefined): SnapEndpoint | null {
  const location = waypoint?.location;
  const distance = waypoint?.distance;
  if (!Array.isArray(location) || location.length !== 2 || !location.every(Number.isFinite)) return null;
  return {
    input,
    snapped: location as Position,
    distance_meters: typeof distance === "number" && Number.isFinite(distance) ? distance : 0,
  };
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 64_000) {
    return NextResponse.json({ error: "Rute terlalu besar." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isLineString(body.route)) {
    return NextResponse.json(
      { error: "Rute harus berupa GeoJSON LineString dengan 2–2.000 titik." },
      { status: 400 },
    );
  }

  const sampledCoordinates = sampleRoute(body.route);
  const coordinates = sampledCoordinates
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(";");
  const baseUrl = (process.env.OSRM_BASE_URL || "https://router.project-osrm.org").replace(/\/+$/, "");
  const profile = (process.env.OSRM_PROFILE || "driving").trim();
  if (!/^[a-z0-9_-]+$/i.test(profile)) {
    return NextResponse.json({ error: "Profil routing tidak valid." }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${baseUrl}/route/v1/${profile}/${coordinates}?alternatives=false&overview=simplified&geometries=geojson&steps=false`,
      { cache: "no-store", signal: AbortSignal.timeout(8_000) },
    );
    const result = await response.json().catch(() => null) as {
      code?: string;
      message?: string;
      routes?: { distance?: number; duration?: number; geometry?: unknown }[];
      waypoints?: { distance?: number; location?: unknown }[];
    } | null;
    const snapped = result?.routes?.[0];
    const start = snapEndpoint(sampledCoordinates[0], result?.waypoints?.[0]);
    const end = snapEndpoint(sampledCoordinates.at(-1)!, result?.waypoints?.at(-1));
    if (!response.ok || result?.code !== "Ok" || !snapped || !isLineString(snapped.geometry) || !start || !end) {
      return NextResponse.json(
        { error: result?.message || "Jaringan jalan tidak menemukan rute yang sesuai." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      route: snapped.geometry,
      distance_meters: Number.isFinite(snapped.distance) ? snapped.distance : 0,
      duration_seconds: Number.isFinite(snapped.duration) ? snapped.duration : 0,
      provider: "osrm",
      endpoints: { start, end },
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json(
      { error: timedOut ? "Pencarian jalan melewati batas waktu." : "Layanan pencarian jalan tidak tersedia." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
