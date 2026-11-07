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
import type { HousingElementSite } from "./retrieve";

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
