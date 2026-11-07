import { NextResponse, type NextRequest } from "next/server";
import { ASSUMPTIONS, THROTTLE_LIMIT, THROTTLE_WINDOW_MS } from "@/lib/scout/config";
import { runScout } from "@/lib/scout/scout";
import { scoutSources } from "@/lib/scout/sources";
import { createThrottle } from "@/lib/scout/throttle";

/** ASSUMPTION: 10 requests per minute per client (see ASSUMPTIONS.throttle). */
const throttle = createThrottle(THROTTLE_LIMIT, THROTTLE_WINDOW_MS);

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/**
 * GET /api/scout?q=Anaheim, 40+ affordable units, near transit
 *
 * Runs the scouting agent and returns criteria, ranked candidates, the
 * sources used (with checked dates), warnings and the assumptions applied.
 * Prototype only: not legal or financial advice.
 */
export async function GET(request: NextRequest) {
  const decision = throttle(clientKey(request));
  if (!decision.ok) {
    return NextResponse.json(
      {
        error: `Too many requests: limit is ${THROTTLE_LIMIT} per minute (ASSUMPTION, prototype throttle). Try again shortly.`,
      },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json(
      { error: "Missing ?q= search text, e.g. ?q=Anaheim, 40+ affordable units, near transit" },
      { status: 400 },
    );
  }
  const result = await runScout(q);
  return NextResponse.json({
    query: result.query,
    status: result.status,
    reason: result.reason,
    criteria: result.criteria,
    parser: result.parser,
    candidates: result.candidates,
    sitesInCity: result.sitesInCity,
    sources: result.sources.map((id) => scoutSources[id]),
    warnings: result.warnings,
    explainer: result.explainer,
    degraded: result.degraded,
    assumptions: Object.values(ASSUMPTIONS),
    disclaimer:
      "Prototype. Leads from public data, not a feasibility finding, legal or financial advice. Confirm with the city and a professional.",
    generatedAt: result.generatedAt,
  });
}
