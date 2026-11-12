import { NextResponse, type NextRequest } from "next/server";
import { MAX_LIMIT, isAerialLabel, isSiteSource, search, type SiteSource } from "@/lib/search";

/**
 * GET /api/search?q=&city=&source=&pathway=&aerial=&limit=&offset=
 * Prototype only: leads from public data, not legal or financial advice.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const source = sp.get("source");
  if (source && !isSiteSource(source)) {
    return NextResponse.json({ error: "source must be tax-defaulted, surplus-notice or housing-element" }, { status: 400 });
  }
  const aerial = sp.get("aerial");
  if (aerial && !isAerialLabel(aerial)) {
    return NextResponse.json({ error: "aerial must be vacant-lot, parking-lot, building-intact, building-possibly-distressed or unclear" }, { status: 400 });
  }
  const num = (k: string) => {
    const v = sp.get(k);
    if (v === null || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const limit = num("limit");
  const offset = num("offset");
  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    return NextResponse.json({ error: "limit and offset must be numbers" }, { status: 400 });
  }
  const res = search({
    q: sp.get("q")?.slice(0, 200) || undefined,
    city: sp.get("city")?.slice(0, 80) || undefined,
    source: source ? (source as SiteSource) : undefined,
    pathway: sp.get("pathway")?.slice(0, 40) || undefined,
    aerial: aerial && isAerialLabel(aerial) ? aerial : undefined,
    limit: limit === undefined ? undefined : Math.min(MAX_LIMIT, limit),
    offset,
  });
  return NextResponse.json(res);
}
