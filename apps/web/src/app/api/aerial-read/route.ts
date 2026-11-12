import { NextResponse, type NextRequest } from "next/server";
import { aerialRead } from "@/lib/search/aerial";
import { THROTTLE_LIMIT, THROTTLE_WINDOW_MS } from "@/lib/scout/config";
import { createThrottle } from "@/lib/scout/throttle";

/** ASSUMPTION: same per-client limit as /api/scout (10 per minute), to bound Claude and USGS calls. */
const throttle = createThrottle(THROTTLE_LIMIT, THROTTLE_WINDOW_MS);

/**
 * GET /api/aerial-read?id=<SiteResult.id>
 * Always HTTP 200 with an AerialRead (available:false when no key or no
 * coordinates). Cached on disk per id so each site is read once.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id || id.length > 120) {
    return NextResponse.json({ error: "Missing ?id=<site id>" }, { status: 400 });
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const decision = throttle(forwarded || request.headers.get("x-real-ip") || "local");
  if (!decision.ok) {
    return NextResponse.json(
      { error: `Too many requests: limit is ${THROTTLE_LIMIT} per minute (ASSUMPTION). Try again shortly.` },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }
  return NextResponse.json(await aerialRead(id));
}
