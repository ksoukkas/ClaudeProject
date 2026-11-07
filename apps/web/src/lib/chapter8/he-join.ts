import fs from "node:fs";
import path from "node:path";
import { normalizeApn } from "@/lib/market/csv";

/**
 * Server-only join against the cached SCAG adopted housing-element sites
 * (public/data/he-sites.geojson, fetched by scripts/fetch-he-sites.mjs).
 * A parcel is "on the city's housing element site list" when its APN digits
 * match a site's APN. Absence is a real "no" because the cached layer holds
 * every Orange County site the layer had on the fetch date.
 */

type Feature = { properties?: { apn?: string | null; apn24?: string | null; jurisdiction?: string | null } };

let cache: { apns: Set<string>; checked: string | null; count: number } | null = null;

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
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "he-sites.meta.json"), "utf8")) as { checked?: string };
    checked = meta.checked ?? null;
  } catch {
    // Missing or unreadable file: every lookup returns null (unknown), never false.
    cache = { apns, checked: null, count: 0 };
    return cache;
  }
  cache = { apns, checked, count };
  return cache;
}

/** true / false when the layer was readable, null when it was not. */
export function onHousingElementList(apn: string | null): boolean | null {
  const { apns, count } = load();
  if (count === 0) return null;
  const key = normalizeApn(apn);
  if (!key) return null;
  return apns.has(key);
}

export function housingElementLayerInfo() {
  const { checked, count } = load();
  return { checked, count };
}
