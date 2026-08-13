import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    services: {
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      road_router: Boolean(process.env.OSRM_BASE_URL),
      network_isochrone: Boolean(process.env.ISOCHRONE_API_KEY),
      ai_insight: Boolean(process.env.AI_SERVICE_URL && process.env.AI_SERVICE_TOKEN),
    },
  });
}
