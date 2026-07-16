import { NextResponse } from "next/server";
import { BackendError, callRpc } from "@/lib/supabase";
import { type AnalysisResult, isLineString } from "@/lib/types";

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

  try {
    return NextResponse.json(
      await callRpc<AnalysisResult>("analyze_route", { p_route: body.route }),
    );
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Analisis spasial gagal.";
    return NextResponse.json({ error: message }, { status });
  }
}
