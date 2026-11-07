import fs from "node:fs";
import path from "node:path";
import { normalizeApn } from "@/lib/market/csv";

/**
 * Server-only join against the cached SCAG adopted housing-element sites
 * (public/data/he-sites.geojson, fetched by scripts/fetch-he-sites.mjs).
 * A parcel is "on the city's housing element site list" when its APN digits
 * match a site's APN. Absence counts as a real "no" only for jurisdictions the
 * layer actually covers; for a city with zero records (Santa Ana, on the fetch
 * date) the answer is unknown, so the score gives half points and says to verify.
 */

type Feature = { properties?: { apn?: string | null; apn24?: string | null; jurisdiction?: string | null } };

let cache: {
  apns: Set<string>;
  checked: string | null;
  count: number;
  byJurisdiction: Record<string, number>;
} | null = null;

function load() {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "public", "data");
  const apns = new Set<string>();
  let count = 0;
  let checked: string | null = null;
  try {
    const geo = JSON.parse(fs.readFileSync(path.join(dir, "he-sites.geojson"), "utf8")) as { features: Feature[] };
    for (const f of geo.features) {
      count++;
      const a = normalizeApn(f.properties?.apn ?? null) ?? (f.properties?.apn24 ? f.properties.apn24.replace(/\D/g, "") : null);
      if (a) apns.add(a);
    }
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "he-sites.meta.json"), "utf8")) as {
      checked?: string;
      recordsByJurisdiction?: Record<string, number>;
    };
    checked = meta.checked ?? null;
    cache = { apns, checked, count, byJurisdiction: meta.recordsByJurisdiction ?? {} };
    return cache;
  } catch {
    // Missing or unreadable file: every lookup returns null (unknown), never false.
    cache = { apns, checked: null, count: 0, byJurisdiction: {} };
    return cache;
  }
}

/**
 * true when the APN is on the list; false when the layer covers the city and
 * the APN is absent; null when the layer is unreadable, the APN is unusable,
 * or the layer has no records for that city.
 */
export function onHousingElementList(apn: string | null, city: string | null): boolean | null {
  const { apns, count, byJurisdiction } = load();
  if (count === 0) return null;
  const key = normalizeApn(apn);
  if (!key) return null;
  if (apns.has(key)) return true;
  const covered = city ? (byJurisdiction[city.trim().toUpperCase()] ?? 0) > 0 : false;
  return covered ? false : null;
}

export function housingElementLayerInfo() {
  const { checked, count } = load();
  return { checked, count };
}
