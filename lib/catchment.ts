import "server-only";

import type { FeatureCollection, LineString, Position } from "@/lib/types";
import { normalizeMapGeoJSON } from "@/lib/types";

type StopProperties = { id: string; sequence: number };

export type CatchmentInput = {
  stops: FeatureCollection<StopProperties>;
  serviceAreas: FeatureCollection | null;
  method: "network_isochrone" | "stop_buffer";
  provider: string;
};

const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters([lon1, lat1]: Position, [lon2, lat2]: Position) {
  const toRadians = Math.PI / 180;
  const phi1 = lat1 * toRadians;
  const phi2 = lat2 * toRadians;
  const deltaPhi = (lat2 - lat1) * toRadians;
  const deltaLambda = (lon2 - lon1) * toRadians;
  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function routeLengthMeters(route: LineString) {
  return route.coordinates.slice(1).reduce((total, point, index) => (
    total + haversineMeters(route.coordinates[index], point)
  ), 0);
}

function routeStops(route: LineString, spacingMeters: number, maxStops: number): FeatureCollection<StopProperties> {
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let index = 1; index < route.coordinates.length; index += 1) {
    const length = haversineMeters(route.coordinates[index - 1], route.coordinates[index]);
    segmentLengths.push(length);
    totalLength += length;
  }

  const stopCount = Math.min(maxStops, Math.max(2, Math.ceil(totalLength / spacingMeters) + 1));
  const positions = Array.from({ length: stopCount }, (_, stopIndex) => {
    const target = stopCount === 1 ? 0 : totalLength * stopIndex / (stopCount - 1);
    let traversed = 0;
    for (let segmentIndex = 0; segmentIndex < segmentLengths.length; segmentIndex += 1) {
      const segmentLength = segmentLengths[segmentIndex];
      if (target <= traversed + segmentLength || segmentIndex === segmentLengths.length - 1) {
        const ratio = segmentLength > 0 ? Math.min(1, Math.max(0, (target - traversed) / segmentLength)) : 0;
        const start = route.coordinates[segmentIndex];
        const end = route.coordinates[segmentIndex + 1];
        return [
          start[0] + (end[0] - start[0]) * ratio,
          start[1] + (end[1] - start[1]) * ratio,
        ] as Position;
      }
      traversed += segmentLength;
    }
    return route.coordinates.at(-1)!;
  });

  return {
    type: "FeatureCollection",
    features: positions.map((coordinates, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { id: `stop-${index + 1}`, sequence: index + 1 },
    })),
  };
}

async function requestOpenRouteService(
  stops: FeatureCollection<StopProperties>,
  walkingMinutes: number,
): Promise<FeatureCollection | null> {
  const apiKey = process.env.ISOCHRONE_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.ISOCHRONE_BASE_URL || "https://api.openrouteservice.org").replace(/\/+$/, "");
  const profile = (process.env.ISOCHRONE_PROFILE || "foot-walking").trim();
  if (!/^https?:\/\//i.test(baseUrl) || !/^[a-z0-9-]+$/i.test(profile)) return null;

  const batchSize = 5;
  const batches = Array.from({ length: Math.ceil(stops.features.length / batchSize) }, (_, index) => (
    stops.features.slice(index * batchSize, (index + 1) * batchSize)
  ));

  try {
    const collections = await Promise.all(batches.map(async (batch) => {
      const response = await fetch(`${baseUrl}/v2/isochrones/${profile}`, {
        method: "POST",
        headers: {
          authorization: apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locations: batch.map((feature) => feature.geometry.coordinates),
          range: [walkingMinutes * 60],
          range_type: "time",
          smoothing: 10,
        }),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Isochrone provider rejected the request");
      const normalized = normalizeMapGeoJSON(await response.json());
      if (!normalized || normalized.type !== "FeatureCollection") throw new Error("Isochrone provider returned invalid GeoJSON");
      if (normalized.features.some((feature) => !["Polygon", "MultiPolygon"].includes(feature.geometry.type))) {
        throw new Error("Isochrone provider returned unsupported geometry");
      }
      return normalized;
    }));

    return {
      type: "FeatureCollection",
      features: collections.flatMap((collection) => collection.features).slice(0, 100),
    };
  } catch {
    return null;
  }
}

export async function prepareCatchment(route: LineString): Promise<CatchmentInput> {
  const spacingMeters = 800;
  const maxStops = 30;
  const walkingMinutes = 10;
  const stops = routeStops(route, spacingMeters, maxStops);
  const serviceAreas = await requestOpenRouteService(stops, walkingMinutes);

  return serviceAreas
    ? { stops, serviceAreas, method: "network_isochrone", provider: "openrouteservice" }
    : { stops, serviceAreas: null, method: "stop_buffer", provider: "postgis" };
}
