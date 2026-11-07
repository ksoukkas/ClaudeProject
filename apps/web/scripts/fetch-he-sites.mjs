#!/usr/bin/env node
/**
 * One cached pull of adopted Housing Element sites for the map's public layer.
 *
 *   node scripts/fetch-he-sites.mjs
 *
 * Source: SCAG HousingElementSite_poly_scag (VERIFIED in
 * lanes/1-find-it/data/DATA-SOURCES.md). Every Orange County site (about
 * 2,100). A handful of requests in total: layer metadata, a count, and at most
 * MAX_PAGES pages of 2,000. If the count would need more pages, the script
 * stops instead of crawling.
 *
 * Writes public/data/he-sites.geojson (one point per site, at the polygon's
 * centroid) and public/data/he-sites.meta.json. Commit both so the demo works
 * offline. Re-run only when you want a fresh copy.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LAYER =
  "https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0";
const WHERE = "COUNTY='Orange'";
// 2,126 OC sites on 2026-11-07, so two pages. Hard cap so this never crawls.
const MAX_PAGES = 3;
const FIELDS = [
  "OBJECTID",
  "Assessor_Parcel_Number",
  "APN24",
  "Jurisdiction",
  "Low_Income_HE_Capacity",
  "Moderate_Income_HE_Capacity",
  "Above_Moderate_Income_HE_Capacity",
  "Total_HE_Capacity",
  "YEAR",
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "siteline-hackathon-prototype" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const body = await res.json();
  if (body.error) throw new Error(`ArcGIS error for ${url}: ${JSON.stringify(body.error)}`);
  return body;
}

function queryUrl(params) {
  return `${LAYER}/query?${new URLSearchParams({ f: "json", ...params })}`;
}

/** Area-weighted centroid of a ring ([lng, lat] pairs). Falls back to the vertex mean. */
function ringCentroid(ring) {
  let a = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    a += f;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
  }
  if (Math.abs(a) < 1e-14) {
    const n = ring.length;
    return { area: 0, point: [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n] };
  }
  return { area: Math.abs(a / 2), point: [x / (3 * a), y / (3 * a)] };
}

/** Centroid of the largest outer ring of a Polygon or MultiPolygon. */
function centroid(geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  let best = null;
  for (const polygon of polygons) {
    const c = ringCentroid(polygon[0]);
    if (!best || c.area > best.area) best = c;
  }
  return best ? best.point.map((v) => Number(v.toFixed(6))) : null;
}

async function main() {
  // 1. Inspect the layer and confirm the fields we need exist.
  const layer = await getJson(`${LAYER}?f=json`);
  const available = new Set((layer.fields ?? []).map((f) => f.name));
  const missing = FIELDS.filter((f) => !available.has(f));
  if (missing.length) throw new Error(`Schema changed; missing fields: ${missing.join(", ")}`);

  const where = WHERE;

  // 2. Count first, so the number of pages is known up front.
  const { count } = await getJson(queryUrl({ where, returnCountOnly: "true" }));
  const max = layer.maxRecordCount ?? 1000;
  const pages = Math.ceil(count / max);
  if (pages > MAX_PAGES) throw new Error(`${count} records needs ${pages} pages (cap ${MAX_PAGES}); narrow the query`);

  // 3. The records, polygons in WGS84 (this MapServer ignores returnCentroid).
  const query = {
    where,
    outFields: FIELDS.join(","),
    returnGeometry: "true",
    outSR: "4326",
    geometryPrecision: "6",
    orderByFields: "OBJECTID",
    f: "geojson",
  };
  const raw = [];
  for (let page = 0; page < pages; page++) {
    const params = { ...query, resultOffset: String(page * max), resultRecordCount: String(max) };
    const url = `${LAYER}/query?${new URLSearchParams(params)}`;
    const res = await fetch(url, { headers: { "User-Agent": "siteline-hackathon-prototype" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    const fc = await res.json();
    if (fc.error) throw new Error(`ArcGIS error: ${JSON.stringify(fc.error)}`);
    raw.push(...(fc.features ?? []));
  }
  if (raw.length !== count) throw new Error(`Got ${raw.length} records but the count said ${count}`);

  const checked = new Date().toISOString().slice(0, 10);
  const byJurisdiction = {};
  const features = [];
  for (const f of raw) {
    const point = f.geometry ? centroid(f.geometry) : null;
    if (!point) continue;
    const p = f.properties ?? {};
    byJurisdiction[p.Jurisdiction] = (byJurisdiction[p.Jurisdiction] ?? 0) + 1;
    // Only fields that are actually in the source. Nothing derived or invented.
    features.push({
      type: "Feature",
      id: p.OBJECTID,
      geometry: { type: "Point", coordinates: point },
      properties: {
        apn: p.Assessor_Parcel_Number ?? null,
        apn24: p.APN24 ?? null,
        jurisdiction: p.Jurisdiction ?? null,
        lowIncomeCapacity: p.Low_Income_HE_Capacity ?? null,
        moderateIncomeCapacity: p.Moderate_Income_HE_Capacity ?? null,
        aboveModerateIncomeCapacity: p.Above_Moderate_Income_HE_Capacity ?? null,
        totalCapacity: p.Total_HE_Capacity ?? null,
        year: p.YEAR ?? null,
      },
    });
  }

  const meta = {
    source: "SCAG HousingElementSite_poly_scag (adopted housing element sites)",
    sourceUrl: LAYER,
    query: { ...query, pages, pageSize: max, note: "Polygons were reduced to their centroid locally (largest ring)." },
    checked,
    recordCount: features.length,
    serverCount: count,
    recordsByJurisdiction: byJurisdiction,
    notes: [
      "Santa Ana has no records in this layer (its jurisdiction value does not appear at all), so the map shows none for it.",
      "Points are polygon centroids, for display only. Use the APN to look up the real parcel.",
      "No feasibility, law or ownership verdict is attached to these records.",
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "he-sites.geojson"), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
  await writeFile(join(outDir, "he-sites.meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`Saved ${features.length} sites (${JSON.stringify(byJurisdiction)}) to ${outDir}`);
}

main().catch((err) => {
  console.error(`fetch-he-sites failed: ${err.message}`);
  process.exit(1);
});
