// Geocode the tax-defaulted OC parcels against the OC Public Works Parcels
// FeatureServer. Run: node scripts/geocode-tax-defaulted.mjs
//
// A few batched requests (APN IN (...)), with a pause between them. APNs the
// layer does not return get nulls, never a guess. Street addresses are kept
// only for unimproved (vacant) parcels: the county list is deliberately shown
// without addresses for improved parcels because most are lived-in homes.
// Output: src/lib/search/data/tax-defaulted-geo.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LAYER = "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/FeatureServer/0";
const BATCH = 40;
const PAUSE_MS = 2000;
const SQFT_PER_ACRE = 43560;

const list = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/chapter8/tax-defaulted-oc.json"), "utf8"));
const parcels = list.parcels;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(apns, outSR) {
  const where = `ASSESSMENT_NO IN (${apns.map((a) => `'${a}'`).join(",")})`;
  const params = new URLSearchParams({
    where,
    outFields: "ASSESSMENT_NO,SITE_ADDRESS",
    returnGeometry: "true",
    outSR: String(outSR),
    f: "json",
  });
  const res = await fetch(`${LAYER}/query?${params}`, { headers: { "User-Agent": "cucumber-hackathon-prototype" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  if (json.exceededTransferLimit) throw new Error("exceededTransferLimit: lower BATCH");
  return json.features ?? [];
}

// Shoelace: signed area and centroid of one ring.
function ring(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const [x0, y0] = r[i], [x1, y1] = r[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a /= 2;
  return { a, cx: a ? cx / (6 * a) : r[0][0], cy: a ? cy / (6 * a) : r[0][1] };
}
// Esri outer rings are clockwise (negative shoelace area), holes the opposite.
function areaOf(rings) { return Math.abs(rings.reduce((s, r) => s + ring(r).a, 0)); }
function centroidOf(rings) {
  const rs = rings.map(ring);
  const big = rs.reduce((m, r) => (Math.abs(r.a) > Math.abs(m.a) ? r : m), rs[0]);
  return { lon: big.cx, lat: big.cy };
}

const rows = new Map();
const apns = parcels.map((p) => p.apn);
for (let i = 0; i < apns.length; i += BATCH) {
  const batch = apns.slice(i, i + BATCH);
  const geo = await query(batch, 4326);
  await sleep(PAUSE_MS);
  const ft = await query(batch, 2230); // NAD83 California zone 6, US survey feet
  for (const f of geo) {
    const apn = f.attributes.ASSESSMENT_NO;
    const rings = f.geometry?.rings;
    if (!rings?.length) continue;
    const c = centroidOf(rings);
    rows.set(apn, { lat: +c.lat.toFixed(6), lon: +c.lon.toFixed(6), address: f.attributes.SITE_ADDRESS?.trim() || null });
  }
  for (const f of ft) {
    const apn = f.attributes.ASSESSMENT_NO;
    const rings = f.geometry?.rings;
    if (!rings?.length || !rows.has(apn)) continue;
    rows.get(apn).acres = +(areaOf(rings) / SQFT_PER_ACRE).toFixed(3);
  }
  if (i + BATCH < apns.length) await sleep(PAUSE_MS);
}

const out = parcels.map((p) => {
  const r = rows.get(p.apn);
  const vacant = p.propertyType === "unimproved";
  return {
    apn: p.apn,
    lat: r?.lat ?? null,
    lon: r?.lon ?? null,
    acres: r?.acres ?? null,
    address: r && vacant ? r.address : null,
  };
});

const found = out.filter((r) => r.lat !== null).length;
const file = {
  source: {
    name: "OC Public Works Parcels (countywide) FeatureServer, layer 0",
    url: LAYER,
    fetchedOn: new Date().toISOString().slice(0, 10),
    method: "Queried ASSESSMENT_NO IN (...) in batches; centroid is the area-weighted centroid of the largest ring (outSR 4326); acres = polygon area in US survey feet (outSR 2230) / 43,560. Computed from geometry, not an official lot size.",
    addressPolicy: "SITE_ADDRESS is kept only for unimproved parcels. Improved parcels are mostly lived-in homes, so their address is left null, matching the county-list file.",
    requested: apns.length,
    found,
  },
  parcels: out,
};
fs.writeFileSync(path.join(ROOT, "src/lib/search/data/tax-defaulted-geo.json"), JSON.stringify(file, null, 1) + "\n");
console.log(`geocoded ${found} of ${apns.length}; addresses kept: ${out.filter((r) => r.address).length}`);
