import { NextResponse } from "next/server";
import { BackendError, callRpc } from "@/lib/supabase";
import type { MapContext } from "@/lib/types";

export async function GET(request: Request) {
  const bbox = new URL(request.url).searchParams.get("bbox")
    ?.split(",")
    .map(Number);
  if (!bbox || bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    return NextResponse.json(
      { error: "Batas peta tidak valid." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await callRpc<MapContext>("get_map_context", { p_bbox: bbox }),
    );
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Layer peta gagal dimuat.";
    return NextResponse.json({ error: message }, { status });
  }
}
