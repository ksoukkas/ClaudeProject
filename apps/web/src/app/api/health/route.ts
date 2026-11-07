import { NextResponse } from "next/server";

/** Liveness check. GET /api/health */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "web",
    time: new Date().toISOString(),
  });
}
