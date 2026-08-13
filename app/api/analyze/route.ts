import { NextResponse } from "next/server";
import { prepareCatchment, routeLengthMeters } from "@/lib/catchment";
import { BackendError, callRpc } from "@/lib/supabase";
import { type AnalysisResult, isLineString } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  const lengthMeters = routeLengthMeters(body.route);
  if (lengthMeters < 1 || lengthMeters > 200_000) {
    return NextResponse.json(
      { error: "Panjang rute harus antara 1 meter dan 200 kilometer." },
      { status: 400 },
    );
  }

  try {
    const catchment = await prepareCatchment(body.route);
    return NextResponse.json(
      await callRpc<AnalysisResult>("analyze_route", {
        p_route: body.route,
        p_service_areas: catchment.serviceAreas,
        p_stops: catchment.stops,
        p_catchment_method: catchment.method,
        p_catchment_provider: catchment.provider,
      }),
    );
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Analisis spasial gagal.";
    return NextResponse.json({ error: message }, { status });
  }
}
