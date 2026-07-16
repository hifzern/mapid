import { NextResponse } from "next/server";
import type { AnalysisResult, Insight } from "@/lib/types";

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
    baseline.formula.buffer_meters,
  ].every(Number.isFinite)) return null;

  const recommendation = analysis?.recommendation;
  if (recommendation && (
    !["north", "south", "east", "west"].includes(recommendation.direction)
    || ![
      recommendation.distance_meters,
      recommendation.score_delta,
      recommendation.population_delta,
      recommendation.population_per_km_delta,
    ].every(Number.isFinite)
  )) return null;

  return {
    score: baseline.score,
    route_length_km: baseline.route_length_km,
    population_covered: baseline.population_covered,
    population_per_km: baseline.population_per_km,
    overlap_pct: baseline.overlap_pct,
    property_go_count: baseline.property_go_count,
    buffer_meters: baseline.formula.buffer_meters,
    recommendation: recommendation ? {
      direction: recommendation.direction,
      distance_meters: recommendation.distance_meters,
      score_delta: recommendation.score_delta,
      population_delta: recommendation.population_delta,
      population_per_km_delta: recommendation.population_per_km_delta,
    } : null,
  };
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
    return NextResponse.json({ error: "Layanan insight AI belum dikonfigurasi." }, { status: 503 });
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
    return NextResponse.json(
      { error: "Insight AI sementara tidak tersedia; hasil spasial tetap valid." },
      { status: 503 },
    );
  }
}
