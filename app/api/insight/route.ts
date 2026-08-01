import { NextResponse } from "next/server";
import type { AnalysisResult, Insight } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function verifiedPayload(value: unknown) {
  const analysis = value as AnalysisResult | undefined;
  const baseline = analysis?.baseline;
  if (!baseline || !baseline.formula || ![
    baseline.score,
    baseline.route_length_km,
    baseline.population_covered,
    baseline.population_per_km,
    baseline.overlap_pct,
    baseline.property_go_count,
    baseline.facility_count,
    baseline.facility_score,
    baseline.stop_count,
    baseline.formula.buffer_meters,
    baseline.formula.walking_minutes,
  ].every(Number.isFinite)) return null;
  if (baseline.score < 0 || baseline.score > 100
    || baseline.overlap_pct < 0 || baseline.overlap_pct > 100
    || baseline.facility_score < 0 || baseline.facility_score > 100
    || baseline.population_covered < 0 || baseline.facility_count < 0
    || baseline.stop_count < 2 || baseline.stop_count > 30
    || baseline.formula.buffer_meters <= 0
    || baseline.formula.walking_minutes <= 0 || baseline.formula.walking_minutes > 60) return null;
  if (!["network_isochrone", "stop_buffer"].includes(baseline.catchment_method)) return null;

  const recommendation = analysis?.recommendation;
  if (recommendation && (
    !["north", "south", "east", "west"].includes(recommendation.direction)
    || ![
      recommendation.distance_meters,
      recommendation.score_delta,
      recommendation.population_delta,
      recommendation.population_per_km_delta,
      recommendation.facility_delta,
    ].every(Number.isFinite)
  )) return null;

  return {
    score: baseline.score,
    route_length_km: baseline.route_length_km,
    population_covered: baseline.population_covered,
    population_per_km: baseline.population_per_km,
    overlap_pct: baseline.overlap_pct,
    property_go_count: baseline.property_go_count,
    facility_count: baseline.facility_count,
    facility_score: baseline.facility_score,
    stop_count: baseline.stop_count,
    buffer_meters: baseline.formula.buffer_meters,
    walking_minutes: baseline.formula.walking_minutes,
    catchment_method: baseline.catchment_method,
    top_area: baseline.population_by_area[0]?.admin_name || null,
    recommendation: recommendation ? {
      direction: recommendation.direction,
      distance_meters: recommendation.distance_meters,
      score_delta: recommendation.score_delta,
      population_delta: recommendation.population_delta,
      population_per_km_delta: recommendation.population_per_km_delta,
      facility_delta: recommendation.facility_delta,
    } : null,
  };
}

function templateInsight(payload: NonNullable<ReturnType<typeof verifiedPayload>>): Insight {
  const catchment = payload.catchment_method === "network_isochrone"
    ? `isochrone berjalan kaki ${payload.walking_minutes} menit dari ${payload.stop_count} halte`
    : `buffer ${payload.buffer_meters} meter dari ${payload.stop_count} halte`;
  const summary = payload.recommendation
    ? `Rute menjangkau ${payload.population_covered.toLocaleString("id-ID")} warga dan ${payload.facility_count} fasilitas publik melalui ${catchment}, dengan overlap ${payload.overlap_pct}%. Alternatif teruji meningkatkan skor ${payload.recommendation.score_delta}.`
    : `Rute menjangkau ${payload.population_covered.toLocaleString("id-ID")} warga dan ${payload.facility_count} fasilitas publik melalui ${catchment}, dengan overlap ${payload.overlap_pct}%. Tidak ada alternatif teruji yang meningkatkan skor.`;
  const actions = payload.recommendation
    ? [`Tinjau pergeseran ${payload.recommendation.distance_meters} meter ke ${payload.recommendation.direction}.`, "Validasi halte dan kondisi jalan sebelum menetapkan koridor."]
    : ["Pertahankan alignment sebagai kajian awal dan validasi halte di lapangan."];
  return { summary, actions, source: "template" };
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 16_000) {
    return NextResponse.json({ error: "Payload insight terlalu besar." }, { status: 413 });
  }

  const payload = verifiedPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ error: "Hasil analisis tidak valid." }, { status: 400 });
  }

  const url = process.env.AI_SERVICE_URL;
  const token = process.env.AI_SERVICE_TOKEN;
  if (!url || !token) {
    return NextResponse.json(templateInsight(payload));
  }

  try {
    const response = await fetch(`${url}/insight`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null) as Insight | null;
    if (!response.ok || !result) throw new Error("AI service failed");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(templateInsight(payload));
  }
}
