import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTERS,
  type FilterState,
  applyFilters,
  countByOption,
  describeQuery,
  goalFit,
  ignoredReason,
  parseFilterParams,
  parseQuery,
  readFilterParams,
  removeUnderstood,
  resetFilters,
  resolveFilters,
  sortParcels,
  stripQueryTerms,
  toSearchParams,
  updateFilters,
} from "./filters";
import { type Parcel, parcels, sampleCities } from "./sample-data";

const cities = sampleCities;
const ids = (list: Parcel[]) => list.map((p) => p.id);
const state = (patch: Partial<FilterState> = {}): FilterState => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe("URL params", () => {
  it("defaults serialize to an empty string and parse back", () => {
    assert.equal(toSearchParams(DEFAULT_FILTERS).toString(), "");
    assert.deepEqual(parseFilterParams(new URLSearchParams("")), DEFAULT_FILTERS);
  });

  it("round-trips a fully set state", () => {
    const full = state({
      q: "Anaheim, faith-owned",
      cities: ["Anaheim", "Santa Ana"],
      law: "SB4",
      owner: "Faith-owned",
      minAcres: 0.25,
      maxAcres: 2,
      unitGoal: 60,
      onMarketOnly: true,
      status: "review",
      sort: "units",
    });
    const params = toSearchParams(full);
    assert.deepEqual(params.getAll("city"), ["Anaheim", "Santa Ana"]);
    assert.equal(params.get("market"), "on");
    assert.equal(params.get("goal"), "60");
    assert.deepEqual(parseFilterParams(params, cities), full);
    // Also through a plain string, as the browser would.
    assert.deepEqual(parseFilterParams(new URLSearchParams(params.toString()), cities), full);
  });

  it("accepts the Next.js searchParams object shape", () => {
    const parsed = parseFilterParams(
      { city: ["Santa Ana", "Fullerton"], status: "feasible", sort: undefined },
      cities,
    );
    assert.deepEqual(parsed.cities, ["Santa Ana", "Fullerton"]);
    assert.equal(parsed.status, "feasible");
    assert.equal(parsed.sort, "fit");
  });

  it("omits defaults", () => {
    const params = toSearchParams(state({ status: "blocked" }));
    assert.equal(params.toString(), "status=blocked");
  });

  it("falls back to defaults on bad values", () => {
    const parsed = parseFilterParams(
      new URLSearchParams(
        "city=Atlantis&law=SB999&owner=Aliens&minAcres=-1&maxAcres=abc&goal=0&market=maybe&status=great&sort=random",
      ),
      cities,
    );
    assert.deepEqual(parsed, DEFAULT_FILTERS);
    assert.deepEqual(
      parseFilterParams(new URLSearchParams("goal=12.5"), cities).unitGoal,
      DEFAULT_FILTERS.unitGoal,
    );
    assert.deepEqual(
      parseFilterParams(new URLSearchParams("goal=99999999"), cities).unitGoal,
      DEFAULT_FILTERS.unitGoal,
    );
  });

  it("drops an impossible acreage range", () => {
    const parsed = parseFilterParams(new URLSearchParams("minAcres=2&maxAcres=1"));
    assert.equal(parsed.minAcres, null);
    assert.equal(parsed.maxAcres, null);
  });

  it("matches cities, laws and owners case-insensitively and dedupes", () => {
    const parsed = parseFilterParams(
      new URLSearchParams("city=santa%20ana&city=SANTA%20ANA&law=sb4&owner=faith-owned"),
      cities,
    );
    assert.deepEqual(parsed.cities, ["Santa Ana"]);
    assert.equal(parsed.law, "SB4");
    assert.equal(parsed.owner, "Faith-owned");
  });

  it("only reads explicit params", () => {
    assert.deepEqual(readFilterParams(new URLSearchParams("status=review")), {
      status: "review",
    });
  });
});

describe("applyFilters", () => {
  it("shows everything by default, including blocked and low-confidence sites", () => {
    assert.equal(applyFilters(parcels, DEFAULT_FILTERS).length, parcels.length);
  });

  it("filters by city (multi-select)", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ cities: ["Santa Ana"] }))), [
      "civic-orchard",
    ]);
    assert.deepEqual(
      ids(applyFilters(parcels, state({ cities: ["Anaheim", "Fullerton"] }))),
      ["olive-commons", "juniper-mews"],
    );
  });

  it("filters by law", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ law: "SB9" }))), [
      "laurel-court",
      "juniper-mews",
    ]);
  });

  it("filters by owner", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ owner: "Faith-owned" }))), [
      "olive-commons",
    ]);
  });

  it("filters by acreage, inclusive at both ends", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ minAcres: 0.86 }))), [
      "olive-commons",
      "civic-orchard",
    ]);
    assert.deepEqual(ids(applyFilters(parcels, state({ maxAcres: 0.41 }))), [
      "laurel-court",
      "juniper-mews",
    ]);
    assert.deepEqual(
      ids(applyFilters(parcels, state({ minAcres: 0.4, maxAcres: 0.8 }))),
      ["lantern-way", "juniper-mews"],
    );
  });

  it("filters by market status", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ onMarketOnly: true }))), [
      "olive-commons",
      "civic-orchard",
    ]);
  });

  it("filters by feasibility status", () => {
    assert.deepEqual(ids(applyFilters(parcels, state({ status: "blocked" }))), [
      "juniper-mews",
    ]);
  });

  it("combines filters", () => {
    assert.deepEqual(
      ids(applyFilters(parcels, state({ cities: ["Santa Ana"], status: "feasible" }))),
      ["civic-orchard"],
    );
    assert.deepEqual(
      ids(applyFilters(parcels, state({ onMarketOnly: true, status: "feasible" }))),
      ["civic-orchard"],
    );
    assert.deepEqual(
      ids(applyFilters(parcels, state({ owner: "Private", status: "feasible", law: "SB9" }))),
      ["laurel-court"],
    );
    assert.deepEqual(
      applyFilters(parcels, state({ cities: ["Anaheim"], status: "blocked" })),
      [],
    );
  });

  it("never hides sites for the unit goal or the query text", () => {
    assert.equal(
      applyFilters(parcels, state({ unitGoal: 500, q: "near transit" })).length,
      parcels.length,
    );
  });
});

describe("countByOption", () => {
  it("counts each option with every other filter applied", () => {
    const counts = countByOption(parcels, state({ status: "feasible" }), "cities");
    assert.equal(counts.all, 2);
    assert.equal(counts["Santa Ana"], 1);
    assert.equal(counts["Buena Park"], 1);
    assert.equal(counts.Anaheim, undefined);
  });

  it("ignores its own filter", () => {
    const counts = countByOption(parcels, state({ status: "feasible" }), "status");
    assert.deepEqual(counts, { all: 5, review: 2, feasible: 2, blocked: 1 });
  });

  it("counts market status as off/on", () => {
    const counts = countByOption(parcels, state({ cities: ["Santa Ana", "Fullerton"] }), "onMarketOnly");
    assert.equal(counts.off, 2);
    assert.equal(counts.on, 1);
  });

  it("counts laws and owners", () => {
    assert.equal(countByOption(parcels, DEFAULT_FILTERS, "law").SB9, 2);
    assert.equal(countByOption(parcels, DEFAULT_FILTERS, "owner").Private, 2);
  });
});

describe("sortParcels", () => {
  it("fit keeps the sample rank", () => {
    const shuffled = [...parcels].reverse();
    assert.deepEqual(ids(sortParcels(shuffled, "fit")), ids(parcels));
  });

  it("units sorts by the low estimate, ties by rank", () => {
    // laurel-court and juniper-mews both start at 2: rank 3 before rank 5.
    assert.deepEqual(ids(sortParcels([...parcels].reverse(), "units")), [
      "olive-commons",
      "civic-orchard",
      "lantern-way",
      "laurel-court",
      "juniper-mews",
    ]);
  });

  it("acres sorts largest first", () => {
    assert.deepEqual(ids(sortParcels(parcels, "acres")), [
      "olive-commons",
      "civic-orchard",
      "lantern-way",
      "juniper-mews",
      "laurel-court",
    ]);
  });

  it("confidence sorts High > Medium > Low, ties by rank", () => {
    assert.deepEqual(ids(sortParcels(parcels, "confidence")), [
      "juniper-mews",
      "olive-commons",
      "civic-orchard",
      "laurel-court",
      "lantern-way",
    ]);
  });

  it("never puts an unknown above a known value", () => {
    const unknown = { ...parcels[0], id: "unknown", rank: 0, yieldMin: null, yieldMax: null };
    const sorted = sortParcels([unknown, ...parcels], "units");
    assert.equal(sorted.at(-1)?.id, "unknown");
  });

  it("does not mutate its input", () => {
    const copy = [...parcels].reverse();
    const before = ids(copy);
    sortParcels(copy, "acres");
    assert.deepEqual(ids(copy), before);
  });
});

describe("goalFit", () => {
  const range = (yieldMin: number | null, yieldMax: number | null) => ({ yieldMin, yieldMax });

  it("meets when the low estimate reaches the goal (inclusive)", () => {
    assert.equal(goalFit(range(40, 60), 40), "meets");
    assert.equal(goalFit(range(44, 60), 40), "meets");
  });

  it("may meet when only the high estimate reaches it (inclusive)", () => {
    assert.equal(goalFit(range(36, 48), 40), "may-meet");
    assert.equal(goalFit(range(39, 40), 40), "may-meet");
  });

  it("is below when the high estimate is short", () => {
    assert.equal(goalFit(range(36, 39), 40), "below");
    assert.equal(goalFit(range(2, 4), 40), "below");
  });

  it("is unknown without numbers", () => {
    assert.equal(goalFit(range(null, null), 40), "unknown");
    assert.equal(goalFit(range(10, null), 40), "unknown");
    assert.equal(goalFit(range(null, 50), 40), "may-meet");
  });

  it("labels the sample sites against the default goal", () => {
    const fits = Object.fromEntries(parcels.map((p) => [p.id, goalFit(p, 40)]));
    assert.deepEqual(fits, {
      "olive-commons": "meets",
      "civic-orchard": "may-meet",
      "laurel-court": "below",
      "lantern-way": "below",
      "juniper-mews": "below",
    });
  });
});

describe("parseQuery", () => {
  it("reads the Scout example and keeps what it could not use", () => {
    const parsed = parseQuery("Anaheim, 40+ affordable units, near transit", cities);
    assert.deepEqual(parsed.patch, { cities: ["Anaheim"], unitGoal: 40 });
    assert.deepEqual(
      parsed.understood.map((u) => u.label),
      ["Anaheim", "40+ homes"],
    );
    assert.deepEqual(parsed.ignored, ["affordable", "near transit"]);
    assert.equal(ignoredReason("near transit"), "no transit data in this sample");
  });

  it("reads multi-word cities, case-insensitively", () => {
    const parsed = parseQuery("garden grove and SANTA ANA", cities);
    assert.deepEqual(parsed.patch.cities, ["Garden Grove", "Santa Ana"]);
    assert.deepEqual(parsed.ignored, []);
  });

  it("maps faith words to Faith-owned", () => {
    for (const q of ["faith-owned land", "church parking", "congregations", "Faith based"]) {
      assert.equal(parseQuery(q, cities).patch.owner, "Faith-owned", q);
    }
    assert.deepEqual(parseQuery("church parking", cities).ignored, ["parking"]);
  });

  it("maps commercial and corridor to Commercial", () => {
    const parsed = parseQuery("Commercial corridors", cities);
    assert.equal(parsed.patch.owner, "Commercial");
    assert.deepEqual(parsed.understood[0].matched, ["Commercial", "corridors"]);
    assert.deepEqual(parsed.ignored, []);
  });

  it("keeps the first owner type and reports a conflicting one", () => {
    const parsed = parseQuery("church or commercial", cities);
    assert.equal(parsed.patch.owner, "Faith-owned");
    assert.deepEqual(parsed.ignored, ["commercial"]);
  });

  it("maps small and infill to a 0.5-acre cap (ASSUMPTION)", () => {
    const parsed = parseQuery("Small infill sites", cities);
    assert.equal(parsed.patch.maxAcres, 0.5);
    assert.deepEqual(parsed.ignored, []);
  });

  it("reads a unit goal in several forms", () => {
    assert.equal(parseQuery("25 homes", cities).patch.unitGoal, 25);
    assert.equal(parseQuery("60 units", cities).patch.unitGoal, 60);
    assert.equal(parseQuery("100+", cities).patch.unitGoal, 100);
  });

  it("does not read acreage or decimals as a unit goal", () => {
    const parsed = parseQuery("0.5 acres", cities);
    assert.equal(parsed.patch.unitGoal, undefined);
    assert.deepEqual(parsed.ignored, ["0.5 acres"]);
    assert.equal(parseQuery("2 acres", cities).patch.unitGoal, undefined);
  });

  it("puts unknown words in ignored, never drops them", () => {
    const parsed = parseQuery("Irvine, near transit, with a park", cities);
    assert.deepEqual(parsed.patch, {});
    assert.deepEqual(parsed.ignored, ["Irvine", "near transit", "park"]);
  });

  it("handles an empty query", () => {
    assert.deepEqual(parseQuery("", cities), { patch: {}, understood: [], ignored: [] });
  });
});

describe("precedence and query edits", () => {
  it("explicit param > parsed from q > default", () => {
    const fromQ = resolveFilters(
      new URLSearchParams({ q: "Anaheim, faith-owned, 50 homes" }),
      cities,
    );
    assert.deepEqual(fromQ.cities, ["Anaheim"]);
    assert.equal(fromQ.owner, "Faith-owned");
    assert.equal(fromQ.unitGoal, 50);
    assert.equal(fromQ.status, null);

    const explicit = resolveFilters(
      new URLSearchParams({ q: "Anaheim, faith-owned", city: "Santa Ana", owner: "Commercial" }),
      cities,
    );
    assert.deepEqual(explicit.cities, ["Santa Ana"]);
    assert.equal(explicit.owner, "Commercial");

    const d = describeQuery(explicit, cities);
    assert.deepEqual(d.understood, []);
    assert.deepEqual(
      d.overridden.map((u) => u.label),
      ["Anaheim", "Faith-owned"],
    );
  });

  it("removing a chip clears its filter and its words, and the URL round-trips", () => {
    const start = resolveFilters(
      new URLSearchParams({ q: "Anaheim, faith-owned, 40+ homes, near transit" }),
      cities,
    );
    const anaheim = describeQuery(start, cities).understood.find((u) => u.value === "Anaheim")!;
    const next = removeUnderstood(start, anaheim, cities);
    assert.deepEqual(next.cities, []);
    assert.equal(next.q, "faith-owned, 40+ homes, near transit");
    assert.equal(next.owner, "Faith-owned");
    assert.deepEqual(resolveFilters(toSearchParams(next), cities), next);
  });

  it("changing a filter away from the query drops the stale words", () => {
    const start = resolveFilters(new URLSearchParams({ q: "Anaheim, 40+ homes" }), cities);
    const cleared = updateFilters(start, { cities: [] }, cities);
    assert.equal(cleared.q, "40+ homes");
    assert.deepEqual(resolveFilters(toSearchParams(cleared), cities), cleared);

    const goal = updateFilters(start, { unitGoal: 12 }, cities);
    assert.equal(goal.q, "Anaheim");
    assert.deepEqual(resolveFilters(toSearchParams(goal), cities), goal);

    // Adding a city keeps the query's city in force.
    const added = updateFilters(start, { cities: ["Anaheim", "Santa Ana"] }, cities);
    assert.equal(added.q, start.q);
    assert.deepEqual(resolveFilters(toSearchParams(added), cities), added);
  });

  it("reset goes back to what the query says, keeping q", () => {
    const start = resolveFilters(new URLSearchParams({ q: "Anaheim", status: "blocked" }), cities);
    const reset = resetFilters(start, cities);
    assert.equal(reset.q, "Anaheim");
    assert.deepEqual(reset.cities, ["Anaheim"]);
    assert.equal(reset.status, null);
  });

  it("tidies separators when stripping terms", () => {
    assert.equal(stripQueryTerms("Anaheim, 40+ units, near transit", ["40+"]), "Anaheim, units, near transit");
    assert.equal(stripQueryTerms("Anaheim, near transit", ["Anaheim"]), "near transit");
    assert.equal(stripQueryTerms("Anaheim", ["Anaheim"]), "");
  });
});

describe("parseQuery: bill numbers and years", () => {
  it("reads a bill as the law filter, not a unit goal", () => {
    const r = parseQuery("SB 9 lots in Anaheim", cities);
    assert.equal(r.patch.law, "SB9");
    assert.equal(r.patch.unitGoal, undefined);
    assert.deepEqual(r.patch.cities, ["Anaheim"]);
    assert.deepEqual(r.ignored, []);
  });

  it("handles AB 2011 and the SB 684 / 1123 pair", () => {
    assert.equal(parseQuery("AB 2011 commercial corridors", cities).patch.law, "AB2011");
    assert.equal(parseQuery("AB 2011 commercial corridors", cities).patch.unitGoal, undefined);
    const pair = parseQuery("SB 684 / 1123 small sites", cities).patch;
    assert.equal(pair.law, "SB684_SB1123");
    assert.equal(pair.unitGoal, undefined);
  });

  it("leaves unknown bills unused and keeps their digits out of the goal", () => {
    const r = parseQuery("SB 35 sites", cities);
    assert.equal(r.patch.law, undefined);
    assert.equal(r.patch.unitGoal, undefined);
    assert.deepEqual(r.ignored, ["SB 35"]);
  });

  it("ignores a bare year but still reads a year-sized number of homes", () => {
    assert.equal(parseQuery("sites from 2025", cities).patch.unitGoal, undefined);
    assert.equal(parseQuery("2025 homes", cities).patch.unitGoal, 2025);
  });

  it("removing a law chip clears the law filter", () => {
    const state = resolveFilters({ q: "SB 4 land in Anaheim" }, cities);
    assert.equal(state.law, "SB4");
    const item = describeQuery(state, cities).understood.find((u) => u.key === "law");
    assert.ok(item);
    const next = removeUnderstood(state, item, cities);
    assert.equal(next.law, null);
    assert.equal(next.q, "land in Anaheim");
  });
});
