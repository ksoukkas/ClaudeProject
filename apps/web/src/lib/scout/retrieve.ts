/**
 * Low-volume reads from documented public ArcGIS REST layers. One request
 * per layer per search at most, cached in memory (see config.ts).
 * Field names were checked against each layer's ?f=json on 2026-11-07.
 */
import { cached } from "./cache";
import { scagJurisdiction, type OcCity } from "./cities";
import { CACHE_TTL_MS, FETCH_TIMEOUT_MS } from "./config";
import { polygonCentroid, pointInPolygon, type Ring } from "./geo";
import { CALTRANS_HQTA_LAYER, SCAG_HE_LAYER, SCAG_ZONING_LAYER } from "./sources";
import type { TransitFact } from "./types";

export class SourceError extends Error {
  constructor(
    public sourceName: string,
    message: string,
  ) {
    super(`${sourceName}: ${message}`);
  }
}

export type ArcFeature = {
  attributes: Record<string, unknown>;
  geometry?: { rings?: Ring[] };
};
export type ArcResponse = {
  features?: ArcFeature[];
  exceededTransferLimit?: boolean;
  error?: { code?: number; message?: string };
};

const USER_AGENT = "Cucumber-hackathon-prototype (UCI Claude Impact Lab; low-volume, cached)";

async function arcQuery(
  sourceName: string,
  layerUrl: string,
  params: Record<string, string>,
): Promise<ArcResponse> {
  const url = `${layerUrl}/query?${new URLSearchParams({ ...params, f: "json" })}`;
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new SourceError(sourceName, timedOut ? "timed out" : "could not connect");
  }
  if (!res.ok) throw new SourceError(sourceName, `HTTP ${res.status}`);
  let body: ArcResponse;
  try {
    body = (await res.json()) as ArcResponse;
  } catch {
    throw new SourceError(sourceName, "response was not JSON");
  }
  if (body.error) {
    throw new SourceError(sourceName, `service error ${body.error.code ?? ""} ${body.error.message ?? ""}`.trim());
  }
  return body;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export type HousingElementSite = {
  /** Lookup key: the PID24 value, or APN24 when PID24 is missing. */
  pid24: string;
  /** Which SCAG field `pid24` holds. */
  idField: "PID24" | "APN24";
  apn: string;
  jurisdiction: string;
  lower: number;
  moderate: number;
  aboveModerate: number;
  total: number;
  year: number | null;
  /** Shape.STArea() in the layer's native CRS (EPSG:26911, square metres). */
  areaM2: number | null;
  centroid: [number, number] | null;
};

/** Every SCAG housing-element site for one OC city. One request, cached. */
export function fetchHousingElementSites(
  city: OcCity,
): Promise<{ sites: HousingElementSite[]; truncated: boolean; duplicates: number }> {
  const jurisdiction = scagJurisdiction(city);
  return cached(`he:${jurisdiction}`, CACHE_TTL_MS, async () => {
    const body = await arcQuery("SCAG housing element sites", SCAG_HE_LAYER, {
      where: `COUNTY='Orange' AND Jurisdiction='${jurisdiction.replace(/'/g, "''")}'`,
      outFields: [
        "PID24",
        "APN24",
        "Assessor_Parcel_Number",
        "Jurisdiction",
        "Low_Income_HE_Capacity",
        "Moderate_Income_HE_Capacity",
        "Above_Moderate_Income_HE_Capacity",
        "Total_HE_Capacity",
        "YEAR",
        "Shape.STArea()",
      ].join(","),
      returnGeometry: "true",
      outSR: "4326",
      geometryPrecision: "6",
      resultRecordCount: "2000",
    });
    return parseHousingElementFeatures(body);
  });
}

/** Map raw features to sites; drop rows with no id; keep the first of duplicate ids. */
export function parseHousingElementFeatures(body: ArcResponse): {
  sites: HousingElementSite[];
  truncated: boolean;
  duplicates: number;
} {
  const seen = new Set<string>();
  const sites: HousingElementSite[] = [];
  let duplicates = 0;
  for (const f of body.features ?? []) {
    const a = f.attributes;
    const pid = str(a.PID24);
    const key = pid || str(a.APN24);
    if (!key) continue;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    const area = a["Shape.STArea()"];
    sites.push({
      pid24: key,
      idField: pid ? "PID24" : "APN24",
      apn: str(a.Assessor_Parcel_Number) || str(a.APN24),
      jurisdiction: str(a.Jurisdiction),
      lower: num(a.Low_Income_HE_Capacity),
      moderate: num(a.Moderate_Income_HE_Capacity),
      aboveModerate: num(a.Above_Moderate_Income_HE_Capacity),
      total: num(a.Total_HE_Capacity),
      year: typeof a.YEAR === "number" ? a.YEAR : null,
      areaM2: typeof area === "number" && area > 0 ? area : null,
      centroid: polygonCentroid(f.geometry?.rings),
    });
  }
  return { sites, truncated: Boolean(body.exceededTransferLimit), duplicates };
}

/**
 * Which points fall inside a Caltrans HQTA polygon. One multipoint
 * intersect request returns only the polygons touching any point; the
 * point-by-point test is done locally.
 *
 * If the service truncated its response (exceededTransferLimit), a point
 * with no matching polygon may simply be missing one, so only positive
 * matches are returned and the rest stay unknown.
 */
export function fetchTransitForPoints(
  points: { id: string; at: [number, number] }[],
): Promise<{ facts: Map<string, TransitFact>; truncated: boolean }> {
  const key = `hqta:${points.map((p) => p.id).sort().join(",")}`;
  return cached(key, CACHE_TTL_MS, async () => {
    if (!points.length) return { facts: new Map<string, TransitFact>(), truncated: false };
    const body = await arcQuery("Caltrans HQTA", CALTRANS_HQTA_LAYER, {
      geometry: JSON.stringify({
        points: points.map((p) => p.at),
        spatialReference: { wkid: 4326 },
      }),
      geometryType: "esriGeometryMultipoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "hqta_type,hqta_details,agency_primary",
      returnGeometry: "true",
      outSR: "4326",
      geometryPrecision: "6",
    });
    return transitFromFeatures(points, body);
  });
}

export function transitFromFeatures(
  points: { id: string; at: [number, number] }[],
  body: ArcResponse,
): { facts: Map<string, TransitFact>; truncated: boolean } {
  const truncated = Boolean(body.exceededTransferLimit);
  const facts = new Map<string, TransitFact>();
  const polys = (body.features ?? []).filter((f) => f.geometry?.rings?.length);
  const planned = (f: ArcFeature) => str(f.attributes.hqta_details).includes("planned");
  for (const p of points) {
    const hits = polys.filter((f) => pointInPolygon(p.at, f.geometry!.rings!));
    if (!hits.length && truncated) continue;
    facts.set(p.id, {
      inHqta: hits.length > 0,
      plannedOnly: hits.length > 0 && hits.every(planned),
      types: [...new Set(hits.map((f) => str(f.attributes.hqta_type)).filter(Boolean))],
      agencies: [...new Set(hits.map((f) => str(f.attributes.agency_primary)).filter(Boolean))],
    });
  }
  return { facts, truncated };
}

export type ZoningRecord = { acres: number | null; codes: string[]; year: number | null };

/** PID24 values safe to put in a SQL IN list. */
const SAFE_ID = /^[0-9A-Za-z-]+$/;

/**
 * SCAG zoning by PID24 for a short list of parcels. One request, cached.
 * `truncated` means some parcels' records may be missing from the response.
 */
export function fetchZoning(
  pid24s: string[],
): Promise<{ records: Map<string, ZoningRecord>; truncated: boolean }> {
  const ids = [...new Set(pid24s.filter((p) => SAFE_ID.test(p)))].sort();
  return cached(`zn:${ids.join(",")}`, CACHE_TTL_MS, async () => {
    if (!ids.length) return { records: new Map<string, ZoningRecord>(), truncated: false };
    const body = await arcQuery("SCAG zoning", SCAG_ZONING_LAYER, {
      where: `PID24 IN (${ids.map((p) => `'${p}'`).join(",")})`,
      outFields: "PID24,ACRES,ZN24_CITY,YEAR",
      returnGeometry: "false",
    });
    return zoningFromFeatures(body);
  });
}

export function zoningFromFeatures(body: ArcResponse): {
  records: Map<string, ZoningRecord>;
  truncated: boolean;
} {
  const records = new Map<string, ZoningRecord>();
  for (const f of body.features ?? []) {
    const a = f.attributes;
    const pid = str(a.PID24);
    if (!pid) continue;
    const prev = records.get(pid) ?? { acres: null, codes: [], year: null };
    const code = str(a.ZN24_CITY);
    records.set(pid, {
      acres: prev.acres ?? (typeof a.ACRES === "number" && a.ACRES > 0 ? a.ACRES : null),
      codes: code && !prev.codes.includes(code) ? [...prev.codes, code] : prev.codes,
      year: prev.year ?? (typeof a.YEAR === "number" ? a.YEAR : null),
    });
  }
  return { records, truncated: Boolean(body.exceededTransferLimit) };
}
