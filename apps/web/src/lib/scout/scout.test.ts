/**
 * Offline tests for the scout's pure parts: parsing, sanitizing, geometry,
 * ranking and the "why" fact check. No network, no API key.
 * Run: npm run test:scout
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateWhy } from "./explain";
import { pointInPolygon, polygonCentroid } from "./geo";
import { sanitizeClaudeCriteria } from "./parse-claude";
import { findCity, parseQueryFallback } from "./parse-fallback";
import { goalBasis, preselect, rankCandidates } from "./rank";
import { cached, cacheTesting, invalidate } from "./cache";
import {
  parseHousingElementFeatures,
  transitFromFeatures,
  zoningFromFeatures,
  type HousingElementSite,
} from "./retrieve";
import { runScout } from "./scout";
import { createThrottle } from "./throttle";

test("fallback parser reads the default search", () => {
  const c = parseQueryFallback("Anaheim, 40+ affordable units, near transit");
  assert.equal(c.city, "Anaheim");
  assert.equal(c.minUnits, 40);
  assert.equal(c.affordability.mentioned, true);
  assert.equal(c.affordability.incomeLevel, null);
  assert.equal(c.nearTransit, true);
  assert.deepEqual(c.pathways, []);
  assert.deepEqual(c.unparsed, []);
});

test("fallback parser: owner hints, pathways, income level, percent", () => {
  const c = parseQueryFallback("faith-owned land in Garden Grove, 20% lower-income, SB 4");
  assert.equal(c.city, "Garden Grove");
  assert.deepEqual(c.ownerHints, ["faith"]);
  assert.deepEqual(c.pathways, ["SB4"]);
  assert.equal(c.affordability.incomeLevel, "lower");
  assert.equal(c.affordability.sharePercent, 20);
  assert.equal(c.minUnits, null);
  assert.equal(c.nearTransit, null);
});

test("city matching: Orange County is not the City of Orange; longest name wins", () => {
  assert.equal(findCity("anywhere in Orange County").city, null);
  assert.equal(findCity("City of Orange, 10 units").city, "Orange");
  assert.equal(findCity("Laguna Niguel infill").city, "Laguna Niguel");
  assert.equal(findCity("San Juan Capistrano").city, "San Juan Capistrano");
  assert.equal(findCity("Los Angeles").city, null);
});

test("fallback parser notes words it did not understand", () => {
  const c = parseQueryFallback("Irvine waterfront vineyard");
  assert.equal(c.city, "Irvine");
  assert.match(c.unparsed[0], /waterfront/);
});

test("Claude output is sanitized: unknown city and invented numbers dropped", () => {
  const c = sanitizeClaudeCriteria(
    {
      city: "Los Angeles",
      minUnits: 50,
      affordable: true,
      incomeLevel: "lower",
      sharePercent: 15,
      nearTransit: true,
      pathways: ["AB2011", "BOGUS"],
      ownerHints: ["faith", "alien"],
      unparsed: [],
    },
    "affordable homes near transit, 40 units",
  );
  assert.equal(c.city, null);
  assert.equal(c.minUnits, null, "50 is not in the query");
  assert.equal(c.affordability.sharePercent, null);
  assert.deepEqual(c.pathways, ["AB2011"]);
  assert.deepEqual(c.ownerHints, ["faith"]);
  assert.ok(c.unparsed.some((n) => n.includes("50")));
  const ok = sanitizeClaudeCriteria({ city: "anaheim", minUnits: 40 }, "Anaheim 40 units");
  assert.equal(ok.city, "Anaheim");
  assert.equal(ok.minUnits, 40);
});

const square: [number, number][] = [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 2],
  [0, 0],
];

test("geometry: centroid and point-in-polygon with a hole", () => {
  assert.deepEqual(polygonCentroid([square]), [1, 1]);
  const hole: [number, number][] = [
    [0.5, 0.5],
    [1.5, 0.5],
    [1.5, 1.5],
    [0.5, 1.5],
    [0.5, 0.5],
  ];
  assert.equal(pointInPolygon([0.25, 0.25], [square, hole]), true);
  assert.equal(pointInPolygon([1, 1], [square, hole]), false);
  assert.equal(pointInPolygon([3, 3], [square]), false);
});

function site(pid: string, lower: number, moderate: number, above: number): HousingElementSite {
  return {
    pid24: pid,
    idField: "PID24",
    apn: `${pid}-apn`,
    jurisdiction: "ANAHEIM",
    lower,
    moderate,
    aboveModerate: above,
    total: lower + moderate + above,
    year: 2025,
    areaM2: 4046.8564224,
    centroid: [Number(pid), 0],
  };
}

test("goal basis follows the stated income level (ASSUMPTION for plain 'affordable')", () => {
  const s = site("1", 10, 20, 30);
  assert.equal(goalBasis(parseQueryFallback("Anaheim 40 affordable units"), s).units, 10);
  assert.equal(goalBasis(parseQueryFallback("Anaheim 40 moderate-income units"), s).units, 30);
  assert.equal(goalBasis(parseQueryFallback("Anaheim 40 units"), s).units, 60);
});

test("ranking is deterministic, explained and never 'feasible'", () => {
  const criteria = parseQueryFallback("Anaheim, 40+ affordable units, near transit");
  const sites = [site("1", 86, 0, 0), site("2", 49, 0, 0), site("3", 30, 0, 0), site("4", 0, 0, 90)];
  const shortlist = preselect(sites, criteria);
  assert.deepEqual(
    shortlist.map((s) => s.pid24),
    ["1", "2", "3"],
    "zero lower-income capacity is dropped",
  );
  const transit = new Map([
    ["1", { inHqta: false, plannedOnly: false, types: [], agencies: [] }],
    ["2", { inHqta: true, plannedOnly: false, types: ["major_stop_bus"], agencies: ["OCTA"] }],
    ["3", { inHqta: true, plannedOnly: true, types: ["major_stop_bus"], agencies: [] }],
  ]);
  const ranked = rankCandidates("Anaheim", shortlist, criteria, {
    transit,
    transitNote: "n/a",
    zoning: new Map(),
  });
  assert.deepEqual(
    ranked.map((c) => [c.pid24, c.score]),
    [
      ["2", 80],
      ["1", 50],
      ["3", 47.5],
    ],
  );
  for (const c of ranked) {
    assert.equal(c.feasibility, "review");
    assert.equal(c.address, null);
    assert.ok(c.openChecks.some((o) => o.label === "Ownership"));
    assert.ok(c.scoreParts.every((p) => p.why.length > 0));
    assert.equal(c.zoning.value, "unknown");
  }
  assert.equal(ranked[0].meetsGoal, true);
  assert.equal(ranked[2].meetsGoal, false);
  assert.equal(ranked[0].acres.value, 1);
});

test("transit unknown scores zero and is listed as an open check", () => {
  const criteria = parseQueryFallback("Anaheim near transit");
  const [c] = rankCandidates("Anaheim", [site("1", 10, 0, 0)], criteria, {
    transit: null,
    transitNote: "Caltrans HQTA unavailable (timed out)",
    zoning: null,
  });
  assert.equal(c.transit.value, "unknown");
  assert.equal(c.scoreParts.find((p) => p.label === "Transit")?.points, 0);
  assert.ok(c.openChecks.some((o) => o.label === "Transit"));
  assert.ok(c.openChecks.some((o) => o.label === "Zoning"));
});

test("'why' lines with numbers not in the facts are rejected", () => {
  const facts = { apn: "034-460-33", lowerIncomeCapacity: 86, userUnitGoal: 40, acres: 3.01 };
  assert.ok(validateWhy("APN 034-460-33 lists 86 lower-income units against a 40-unit goal; owner unknown.", facts));
  assert.equal(validateWhy("Roughly 120 homes could fit here.", facts), null);
  assert.equal(validateWhy("Land costs about $2 million.", facts), null);
  assert.equal(validateWhy("", facts), null);
  assert.ok(validateWhy("The 3.01-acre site's owner is unknown.", facts));
});

test("with a unit goal, goal-meeting sites rank above higher-scoring sites below it", () => {
  const criteria = parseQueryFallback("Anaheim, 40+ affordable units, near transit");
  const transit = new Map([
    ["1", { inHqta: false, plannedOnly: false, types: [], agencies: [] }],
    ["2", { inHqta: true, plannedOnly: false, types: ["hq_corridor_bus"], agencies: [] }],
  ]);
  const ranked = rankCandidates("Anaheim", [site("1", 45, 0, 0), site("2", 39, 0, 0)], criteria, {
    transit,
    transitNote: "n/a",
    zoning: new Map(),
  });
  assert.deepEqual(
    ranked.map((c) => [c.pid24, c.score, c.meetsGoal]),
    [
      ["1", 50, true],
      ["2", 78.8, false],
    ],
  );
});

test("network down: runScout returns an honest source-error, never throws", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  try {
    const r = await runScout("Brea, 30 affordable units (offline test)");
    assert.equal(r.status, "source-error");
    assert.match(r.reason ?? "", /SCAG housing element sites: could not connect/);
    assert.equal(r.parser.kind, "fallback");
    assert.equal(r.candidates.length, 0);
    assert.equal(r.degraded, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("zoning service down: candidates still return, zoning unknown with a warning", async () => {
  const realFetch = globalThis.fetch;
  const ring = [
    [-117.9, 33.9],
    [-117.899, 33.9],
    [-117.899, 33.901],
    [-117.9, 33.901],
    [-117.9, 33.9],
  ];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("Zoning_poly_OR")) return new Response("oops", { status: 503 });
    return Response.json({
      features: [
        {
          attributes: {
            PID24: "0590000000001",
            Assessor_Parcel_Number: "000-000-01",
            Jurisdiction: "LA HABRA",
            Low_Income_HE_Capacity: 12,
            Moderate_Income_HE_Capacity: 0,
            Above_Moderate_Income_HE_Capacity: 3,
            Total_HE_Capacity: 15,
            YEAR: 2025,
            "Shape.STArea()": 8093.71,
          },
          geometry: { rings: [ring] },
        },
      ],
    });
  }) as typeof fetch;
  try {
    const r = await runScout("La Habra affordable homes (offline test)");
    assert.equal(r.status, "ok");
    assert.equal(r.candidates.length, 1);
    const [c] = r.candidates;
    assert.equal(c.zoning.value, "unknown");
    assert.equal(c.acres.value, 2);
    assert.equal(c.acres.sourceId, "scag-he");
    assert.equal(c.transit.value, "unknown", "transit was not asked for");
    assert.ok(r.warnings.some((w) => w.startsWith("Zoning could not be read: SCAG zoning: HTTP 503")));
    assert.equal(r.degraded, true);
    assert.ok(!r.sources.includes("scag-zoning"));
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- Review fixes (PR #7) ----

test("thousands separators: '1,000 units' is 1000, and a 0-unit goal is ignored", () => {
  assert.equal(parseQueryFallback("Irvine, 1,000 units").minUnits, 1000);
  assert.equal(parseQueryFallback("Irvine, 1,000,000 units").minUnits, null, "too large for the unit pattern");
  const zero = parseQueryFallback("Irvine, 0 units");
  assert.equal(zero.minUnits, null);
  assert.ok(zero.unparsed.some((n) => n.includes("Ignored unit count 0")));
});

test("a goal of 0 (e.g. from older callers) is treated as no goal: no NaN, no false matches", () => {
  const criteria = { ...parseQueryFallback("Irvine affordable"), minUnits: 0 };
  const [c] = rankCandidates("Irvine", [site("1", 50, 0, 0)], criteria, {
    transit: null,
    transitNote: "n/a",
    zoning: new Map(),
  });
  assert.ok(Number.isFinite(c.score));
  assert.equal(c.score, 25, "50 of 100 units (no-goal scale) = 25 points");
  assert.equal(c.meetsGoal, null);
  assert.ok(!c.why.includes("0-unit goal"));
});

test("Claude sanitizer keeps 1000 for '1,000 units'", () => {
  const c = sanitizeClaudeCriteria({ city: "Irvine", minUnits: 1000 }, "Irvine, 1,000 units");
  assert.equal(c.minUnits, 1000);
  assert.ok(!c.unparsed.some((n) => n.includes("not in your search text")));
});

test("why check: thousands separators are normalized everywhere", () => {
  const facts = { totalCapacity: 1000, apn: "590-171-02", localZoningCode: "unknown", inHighQualityTransitArea: "unknown" };
  assert.ok(validateWhy("Listed with 1,000 units of total capacity; owner unknown.", facts));
  assert.equal(validateWhy("Listed with 1,200 units; owner unknown.", facts), null);
});

test("why check: transit, zoning, owner and vague words need a supporting fact", () => {
  const unknownFacts = { lowerIncomeCapacity: 48, localZoningCode: "unknown", inHighQualityTransitArea: "unknown", owner: "unknown" };
  const knownFacts = { lowerIncomeCapacity: 48, localZoningCode: "C-G", inHighQualityTransitArea: true, owner: "unknown" };
  assert.equal(validateWhy("48 lower-income units near a busy station.", unknownFacts), null);
  assert.ok(validateWhy("48 lower-income units inside a high quality transit area; owner unknown.", knownFacts));
  assert.equal(validateWhy("48 units, zoned C-G.", unknownFacts), null);
  assert.ok(validateWhy("48 units in local zone C-G; owner unknown.", knownFacts));
  assert.equal(validateWhy("48 units on a commercial lot.", knownFacts), null, "interprets the zone code");
  assert.equal(validateWhy("48 units next to a church; owner unknown.", knownFacts), null);
  assert.equal(validateWhy("A city-owned parcel with 48 units.", knownFacts), null);
  assert.equal(validateWhy("Room for dozens of homes; owner unknown.", knownFacts), null);
  assert.equal(validateWhy("A nonprofit could build 48 units here.", knownFacts), null);
});

test("'avoid transit' phrasings parse as nearTransit false", () => {
  for (const q of [
    "Anaheim, away from transit",
    "Anaheim, avoid the station",
    "Anaheim far from rail",
    "Anaheim not near transit",
    "Anaheim without any bus",
  ]) {
    assert.equal(parseQueryFallback(q).nearTransit, false, q);
  }
  assert.equal(parseQueryFallback("Anaheim near the train station").nearTransit, true);
});

test("avoid-transit search: transit is not scored and the note says why", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const realFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    if (String(input).includes("Zoning_poly_OR")) return Response.json({ features: [] });
    return Response.json({
      features: [
        {
          attributes: { PID24: "0590000000009", Assessor_Parcel_Number: "000-000-09", Low_Income_HE_Capacity: 5, Moderate_Income_HE_Capacity: 0, Above_Moderate_Income_HE_Capacity: 0, Total_HE_Capacity: 5, YEAR: 2025 },
        },
      ],
    });
  }) as typeof fetch;
  try {
    const r = await runScout("Brea away from transit (offline avoid test)");
    assert.equal(r.criteria.nearTransit, false);
    assert.ok(!urls.some((u) => u.includes("CA_HQ_Transit_Areas")), "HQTA not queried");
    const [c] = r.candidates;
    assert.equal(c.transit.value, "unknown");
    assert.match(c.transit.note ?? "", /avoid transit/);
    assert.ok(!c.scoreParts.some((p) => p.label === "Transit"));
    assert.ok(r.warnings.some((w) => w.includes("asks to avoid transit")));
  } finally {
    globalThis.fetch = realFetch;
  }
});

const sq = (x: number, y: number): [number, number][] => [
  [x, y],
  [x + 1, y],
  [x + 1, y + 1],
  [x, y + 1],
  [x, y],
];

test("HQTA truncated: only positive matches are kept, the rest stay unknown", () => {
  const points: { id: string; at: [number, number] }[] = [
    { id: "a", at: [0.5, 0.5] },
    { id: "b", at: [5.5, 5.5] },
  ];
  const features = [{ attributes: { hqta_type: "major_stop_bus", hqta_details: "x" }, geometry: { rings: [sq(0, 0)] } }];
  const full = transitFromFeatures(points, { features });
  assert.equal(full.truncated, false);
  assert.equal(full.facts.get("b")?.inHqta, false);
  const cut = transitFromFeatures(points, { features, exceededTransferLimit: true });
  assert.equal(cut.truncated, true);
  assert.equal(cut.facts.get("a")?.inHqta, true);
  assert.equal(cut.facts.has("b"), false);
});

test("zoning truncated: missing records say 'may be missing', not 'no record'", () => {
  const z = zoningFromFeatures({ features: [], exceededTransferLimit: true });
  assert.equal(z.truncated, true);
  const [c] = rankCandidates("Anaheim", [site("1", 10, 0, 0)], parseQueryFallback("Anaheim"), {
    transit: null,
    transitNote: "n/a",
    zoning: z.records,
    zoningTruncated: true,
  });
  assert.equal(c.zoning.value, "unknown");
  assert.match(c.zoning.note ?? "", /truncated/);
});

test("HQTA truncation through runScout: warning, degraded, unknown transit", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("CA_HQ_Transit_Areas")) return Response.json({ features: [], exceededTransferLimit: true });
    if (url.includes("Zoning_poly_OR")) return Response.json({ features: [] });
    return Response.json({
      features: [
        {
          attributes: { PID24: "0590000000002", Assessor_Parcel_Number: "000-000-02", Low_Income_HE_Capacity: 50, Moderate_Income_HE_Capacity: 0, Above_Moderate_Income_HE_Capacity: 0, Total_HE_Capacity: 50, YEAR: 2025 },
          geometry: { rings: [sq(-117.9, 33.9)] },
        },
      ],
    });
  }) as typeof fetch;
  try {
    const r = await runScout("Cypress 40 affordable units near transit (offline truncation test)");
    assert.equal(r.status, "ok");
    assert.equal(r.degraded, true);
    assert.ok(r.warnings.some((w) => w.includes("HQTA service truncated")));
    assert.equal(r.candidates[0].transit.value, "unknown");
    assert.equal(r.candidates[0].scoreParts.find((p) => p.label === "Transit")?.points, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("duplicate ids are dropped (first kept); APN24-only sites skip zoning cleanly", () => {
  const attrs = (pid: string | null, apn24: string, lower: number) => ({
    attributes: { PID24: pid, APN24: apn24, Assessor_Parcel_Number: apn24, Low_Income_HE_Capacity: lower, Total_HE_Capacity: lower },
  });
  const parsed = parseHousingElementFeatures({
    features: [attrs("0590000000003", "00000003", 10), attrs("0590000000003", "00000003", 99), attrs(null, "123-45-678", 20)],
  });
  assert.equal(parsed.duplicates, 1);
  assert.deepEqual(
    parsed.sites.map((s) => [s.pid24, s.idField, s.lower]),
    [
      ["0590000000003", "PID24", 10],
      ["123-45-678", "APN24", 20],
    ],
  );
  const ranked = rankCandidates("Anaheim", parsed.sites, parseQueryFallback("Anaheim"), {
    transit: null,
    transitNote: "n/a",
    zoning: new Map(),
  });
  const apnSite = ranked.find((c) => c.pid24 === "123-45-678")!;
  assert.equal(apnSite.zoning.value, "unknown");
  assert.match(apnSite.zoning.note ?? "", /No PID24/);
  assert.equal(new URL(apnSite.links[0].href).searchParams.get("where"), "APN24='123-45-678'");
});

test("cache: compare-and-delete invalidate, recency order on rewrite, ttlFor", async () => {
  cacheTesting.clear();
  let t = 1_000;
  cacheTesting.setClock(() => t);
  try {
    const p1 = cached("k", 100, async () => 1);
    await p1;
    invalidate("k", Promise.resolve(1)); // a different promise: must not delete
    assert.equal(await cached("k", 100, async () => 2), 1, "still the first entry");
    cached("other", 100, async () => 0);
    t += 200; // both expired
    await cached("k", 100, async () => 3);
    assert.deepEqual(cacheTesting.keys(), ["other", "k"], "rewritten key moves to the end");
    invalidate("k", p1); // stale promise: no-op
    assert.ok(cacheTesting.keys().includes("k"));
    // ttlFor shortens the TTL once the value is known.
    await cached("short", 10_000, async () => "degraded", () => 50);
    t += 60;
    assert.equal(await cached("short", 10_000, async () => "fresh", () => 10_000), "fresh");
  } finally {
    cacheTesting.resetClock();
    cacheTesting.clear();
  }
});

test("degraded scout results are cached about a minute, then retried", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  cacheTesting.clear();
  let t = 5_000_000;
  cacheTesting.setClock(() => t);
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  try {
    const q = "Brea, 10 units (offline ttl test)";
    assert.equal((await runScout(q)).degraded, true);
    assert.equal(calls, 1);
    t += 30_000;
    await runScout(q);
    assert.equal(calls, 1, "served from the short cache");
    t += 31_000;
    await runScout(q);
    assert.equal(calls, 2, "retried after the degraded TTL");
  } finally {
    globalThis.fetch = realFetch;
    cacheTesting.resetClock();
    cacheTesting.clear();
  }
});

test("throttle: 10 per window per client, then retry-after", () => {
  let t = 0;
  const check = createThrottle(10, 60_000, () => t);
  for (let i = 0; i < 10; i++) assert.equal(check("1.2.3.4").ok, true);
  const blocked = check("1.2.3.4");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(check("5.6.7.8").ok, true, "other clients unaffected");
  t += 60_001;
  assert.equal(check("1.2.3.4").ok, true);
});
