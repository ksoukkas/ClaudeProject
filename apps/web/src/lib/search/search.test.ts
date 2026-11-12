import assert from "node:assert/strict";
import { test } from "node:test";
import geo from "./data/tax-defaulted-geo.json";
import { aerialImageUrl, search } from "./index";
import { aerialRead, parseAerialReply } from "./aerial";

const all = search({ limit: 200 });

test("full set spans the three sources and facets add up", () => {
  const full = search({ limit: 1 });
  assert.equal(Object.values(full.facets.source).reduce((a, b) => a + b, 0), full.total);
  assert.equal(Object.values(full.facets.city).reduce((a, b) => a + b, 0), full.total);
  assert.equal(full.facets.source["tax-defaulted"], 108);
  assert.equal(full.facets.source["surplus-notice"], 231);
  assert.ok(full.facets.source["housing-element"] > 2000);
  assert.ok(full.sources.every((s) => s.url && s.checkedAt));
});

test("order: tax-defaulted by score desc first", () => {
  const top = search({ source: "tax-defaulted", limit: 200 }).results;
  for (let i = 1; i < top.length; i++) assert.ok((top[i - 1].score ?? 0) >= (top[i].score ?? 0));
  assert.equal(all.results[0].source, "tax-defaulted");
});

test("text match is case-insensitive and needs every term", () => {
  const a = search({ q: "SANTA ANA tax-defaulted", limit: 200 });
  assert.ok(a.total > 0);
  assert.ok(a.results.every((r) => r.city === "Santa Ana" && r.source === "tax-defaulted"));
  assert.equal(search({ q: "santa ana zzzznomatch" }).total, 0);
});

test("APN matches with and without dashes", () => {
  const withDash = search({ q: "002-162-29" });
  const without = search({ q: "00216229" });
  assert.ok(withDash.results.some((r) => r.id === "tax-defaulted:002-162-29"));
  assert.deepEqual(without.results.map((r) => r.id), withDash.results.map((r) => r.id));
});

test("filters: city, source, pathway", () => {
  const c = search({ city: "anaheim", limit: 200 });
  assert.ok(c.total > 0 && c.results.every((r) => r.city === "Anaheim"));
  const s = search({ source: "surplus-notice", limit: 200 });
  assert.equal(s.total, 231);
  assert.ok(s.results.every((r) => r.source === "surplus-notice"));
  const ch8 = search({ pathway: "chapter8", limit: 200 });
  assert.equal(ch8.total, 108);
  const he = search({ pathway: "housing-element", limit: 5 });
  assert.ok(he.results.every((r) => r.source === "housing-element"));
  assert.equal(search({ pathway: "no-such-pathway" }).total, 0);
});

test("pagination and limit clamp", () => {
  const p1 = search({ limit: 10, offset: 0 });
  const p2 = search({ limit: 10, offset: 10 });
  assert.equal(p1.results.length, 10);
  assert.ok(p1.results.every((r) => !p2.results.some((x) => x.id === r.id)));
  assert.equal(search({}).results.length, 50);
  assert.equal(search({ limit: 9999 }).results.length, 200);
  assert.equal(search({ limit: -5 }).results.length, 1);
  assert.equal(search({ offset: 100000 }).results.length, 0);
});

test("SB 4 is unknown for ownership, never inferred", () => {
  for (const r of all.results) {
    const sb4 = r.pathways.find((p) => p.id === "sb4");
    assert.ok(sb4);
    if (sb4.status === "unknown") assert.match(sb4.reason, /Ownership is not in any dataset loaded/);
  }
});

test("chapter8 hit carries the UNVERIFIED legal basis", () => {
  const r = search({ source: "tax-defaulted", limit: 1 }).results[0];
  assert.match(r.pathways.find((p) => p.id === "chapter8")!.reason, /UNVERIFIED/);
});

test("no invented addresses or coordinates: nulls stay null", () => {
  const known = new Map(geo.parcels.map((p) => [p.apn, p]));
  for (const r of search({ source: "tax-defaulted", limit: 200 }).results) {
    const g = known.get(r.apn!)!;
    assert.equal(r.address, g.address);
    assert.equal(r.lat, g.lat);
    assert.equal(r.lon, g.lon);
    assert.equal(r.acres, g.acres);
  }
  const he = search({ source: "housing-element", limit: 200 }).results;
  assert.ok(he.every((r) => r.address === null && r.acres === null));
});

test("aerialImageUrl points at the NAIP exportImage with a bbox around the point", () => {
  const u = new URL(aerialImageUrl(33.75, -117.88, 400));
  assert.match(u.origin + u.pathname, /imagery\.nationalmap\.gov.*ImageServer\/exportImage/);
  const [w, s, e, n] = u.searchParams.get("bbox")!.split(",").map(Number);
  assert.ok(w < -117.88 && e > -117.88 && s < 33.75 && n > 33.75);
  assert.equal(u.searchParams.get("size"), "400,400");
});

test("aerial read without a key is available:false with the caveat", async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const withCoords = all.results.find((r) => r.lat !== null)!;
    const r = await aerialRead(withCoords.id);
    assert.equal(r.available, false);
    assert.match(r.caveat, /AI reading of an aerial image of unknown capture date, not a site inspection/);
    const noCoords = search({ source: "tax-defaulted", limit: 200 }).results.find((x) => x.lat === null)!;
    assert.equal((await aerialRead(noCoords.id)).available, false);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test("model reply parsing falls back to unclear", () => {
  assert.equal(parseAerialReply('{"label":"vacant-lot","notes":"Open ground."}').label, "vacant-lot");
  assert.equal(parseAerialReply('{"label":"haunted","notes":"x"}').label, "unclear");
  assert.equal(parseAerialReply("not json").label, "unclear");
});
