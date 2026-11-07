/**
 * Real public data for the map: adopted Housing Element sites in Orange County
 * from SCAG (cached by scripts/fetch-he-sites.mjs into public/data/). Pure
 * TypeScript, no React, so it runs in the browser, on the server and in tests.
 *
 * These records carry only what the source says (APN, jurisdiction, planned
 * capacity by income level, year). No feasibility, law or ownership verdict.
 */
import meta from "../../public/data/he-sites.meta.json";
import { sampleCities } from "./sample-data";

export const PUBLIC_DATA_URL = "/data/he-sites.geojson";

export type PublicSite = {
  id: number;
  apn: string | null;
  apn24: string | null;
  /** Display name, e.g. "Buena Park" or "Unincorporated Orange County". */
  city: string;
  lowIncomeCapacity: number | null;
  moderateIncomeCapacity: number | null;
  aboveModerateIncomeCapacity: number | null;
  totalCapacity: number | null;
  year: number | null;
  lng: number;
  lat: number;
};

export const publicMeta = {
  sourceUrl: meta.sourceUrl,
  checked: meta.checked,
  recordCount: meta.recordCount,
};

const UNINCORPORATED = "Unincorporated Orange County";

/** "BUENA PARK" -> "Buena Park"; the county's own sites get a clear name. */
export function cityName(jurisdiction: string | null): string {
  if (!jurisdiction) return "Unknown";
  if (jurisdiction.toUpperCase() === "ORANGE COUNTY") return UNINCORPORATED;
  return jurisdiction
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Number of public sites per city, from the cached file's metadata. */
export const publicCountByCity: Record<string, number> = Object.fromEntries(
  Object.entries(meta.recordsByJurisdiction).map(([j, n]) => [cityName(j), n]),
);

/**
 * Every city the Results page knows about: the five sample cities plus every
 * jurisdiction in the public layer. Sorted A–Z. This is the list the city
 * filter, URL params and query reader accept.
 */
export const allCities: readonly string[] = [
  ...new Set([...sampleCities, ...Object.keys(publicCountByCity)]),
].sort((a, b) => a.localeCompare(b));

type Feature = {
  id?: number;
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    apn: string | null;
    apn24: string | null;
    jurisdiction: string | null;
    lowIncomeCapacity: number | null;
    moderateIncomeCapacity: number | null;
    aboveModerateIncomeCapacity: number | null;
    totalCapacity: number | null;
    year: number | null;
  };
};

/** Turn the cached GeoJSON into plain records, skipping anything without a point. */
export function readPublicSites(geojson: { features?: Feature[] }): PublicSite[] {
  const out: PublicSite[] = [];
  for (const [i, f] of (geojson.features ?? []).entries()) {
    if (f.geometry?.type !== "Point") continue;
    const [lng, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const p = f.properties ?? ({} as Feature["properties"]);
    out.push({
      id: f.id ?? i,
      apn: p.apn,
      apn24: p.apn24,
      city: cityName(p.jurisdiction),
      lowIncomeCapacity: p.lowIncomeCapacity,
      moderateIncomeCapacity: p.moderateIncomeCapacity,
      aboveModerateIncomeCapacity: p.aboveModerateIncomeCapacity,
      totalCapacity: p.totalCapacity,
      year: p.year,
      lng,
      lat,
    });
  }
  return out;
}

/**
 * Public sites for the current filters. Only the city filter applies: the
 * source has no law, owner, lot size, listing or feasibility data, so those
 * filters are not used on it (the UI says so). Sorted by planned capacity,
 * largest first, with unknown capacity last.
 */
export function filterPublicSites(
  sites: readonly PublicSite[],
  cities: readonly string[],
): PublicSite[] {
  const wanted = new Set(cities);
  return sites
    .filter((s) => wanted.size === 0 || wanted.has(s.city))
    .sort(
      (a, b) =>
        (b.totalCapacity ?? -1) - (a.totalCapacity ?? -1) || a.city.localeCompare(b.city) || a.id - b.id,
    );
}

/** Sites whose planned capacity reaches the unit goal. A label, never a filter. */
export function meetsGoal(site: PublicSite, goal: number): boolean | null {
  return site.totalCapacity === null ? null : site.totalCapacity >= goal;
}

export type GoalLabel = "meets" | "below" | "unknown";

/** meetsGoal as a string, for map styling and legends. */
export function goalLabel(site: PublicSite, goal: number): GoalLabel {
  const m = meetsGoal(site, goal);
  return m === null ? "unknown" : m ? "meets" : "below";
}

/**
 * GeoJSON for the map layer, with the id kept so a popup can find its record
 * and the goal label so dots can be colored by it.
 */
export function toFeatureCollection(sites: readonly PublicSite[], goal: number) {
  return {
    type: "FeatureCollection" as const,
    features: sites.map((s) => ({
      type: "Feature" as const,
      id: s.id,
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      properties: { id: s.id, totalCapacity: s.totalCapacity ?? 0, goal: goalLabel(s, goal) },
    })),
  };
}

export type Bounds = [[number, number], [number, number]];

/** The box around a set of points, or null when there are none. */
export function boundsOf(points: readonly { lng: number; lat: number }[]): Bounds | null {
  if (points.length === 0) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return [
    [w, s],
    [e, n],
  ];
}
