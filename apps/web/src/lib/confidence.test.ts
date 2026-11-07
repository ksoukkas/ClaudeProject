import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_COPY,
  computeConfidence,
  isStale,
  levelBody,
  normalizeTest,
} from "./confidence";
import { TEST_CATALOG, testsForLaw } from "./law-tests";
import { sampleConfidence } from "./sample-checks";
import { parcels } from "./sample-data";
import type { RawCheck, Reading, Source, SourceKind } from "./types";

const today = "2026-11-07";
const source = (kind: SourceKind, extra: Partial<Source> = {}): Source => ({
  name: "Test layer",
  tier: "official",
  kind,
  dataAsOf: "2026-01-01",
  ...extra,
});
const reading = (
  outcome: Reading["outcome"],
  kind: SourceKind,
  sourceExtra: Partial<Source> = {},
  extra: Partial<Reading> = {},
): Reading => ({ outcome, source: source(kind, sourceExtra), ...extra });
const check = (testId: string, ...readings: Reading[]): RawCheck => ({ testId, readings });

const zone = check("zoned_single_family", reading("Pass", "zoning"));
const size = check("split_lot_size", reading("Pass", "parcels"));
const fire = check("not_very_high_fire_zone", reading("Pass", "hazard_map"));
const human = ["not_historic_district", "no_renter_last_3_years", "not_previously_sb9_split"].map(
  (id) => check(id, reading("Pass", "human_confirmation", { tier: "human" })),
);

const sb9 = (checks: RawCheck[], extra = {}) =>
  computeConfidence({
    tests: testsForLaw("SB9"),
    checks,
    today,
    rulesCheckedOn: today,
    ...extra,
  });
const sb4 = (checks: RawCheck[]) =>
  computeConfidence({ tests: testsForLaw("SB4"), checks, today, rulesCheckedOn: today });

describe("the plan's expected results", () => {
  it("SB 9 with public tests passed and people still to ask", () => {
    const r = sb9([zone, size, fire]);
    expect([r.statusLabel, r.level, r.score]).toEqual(["Check 3", "Medium", 1.5]);
  });
  it("SB 9 with everything passed", () => {
    const r = sb9([zone, size, fire, ...human]);
    expect([r.statusLabel, r.level, r.score]).toEqual(["Looks good", "High", 6]);
  });
  it("fire has no data", () => {
    const r = sb9([zone, size]);
    expect([r.statusLabel, r.level, r.score]).toEqual(["Check 4", "Low", 0]);
  });
  it("gate test is unknown", () => {
    const r = sb9([size, fire]);
    expect([r.statusLabel, r.level, r.score]).toEqual(["Check 4", "Not enough data", 0]);
  });
  it("a Fail is a Red flag at High, whatever else is open", () => {
    const r = sb9([zone, size, check("not_very_high_fire_zone", reading("Fail", "hazard_map"))]);
    expect([r.statusLabel, r.level, r.score]).toEqual(["Red flag", "High", -1.5]);
  });
  it("a Fail on a stale layer drops one step", () => {
    const stale = reading("Fail", "hazard_map", { dataAsOf: "2011-01-01" });
    const r = sb9([zone, size, check("not_very_high_fire_zone", stale)]);
    expect([r.statusLabel, r.level]).toEqual(["Red flag", "Medium"]);
  });
  it("all Pass on sample data caps at Low and keeps the uncapped level", () => {
    const all = [zone, size, fire, ...human].map((c) => ({
      ...c,
      readings: c.readings.map((x) => ({ ...x, source: { ...x.source, sample: true } })),
    }));
    const r = sb9(all);
    expect([r.statusLabel, r.level, r.uncappedLevel]).toEqual(["Looks good", "Low", "High"]);
  });
  it("a sample Fail caps at Low", () => {
    const r = sb9([check("not_very_high_fire_zone", reading("Fail", "hazard_map", { sample: true }))]);
    expect([r.status, r.level, r.uncappedLevel]).toEqual(["Red flag", "Low", "High"]);
  });
  it("SB 4 with 3 of 14 tests answered", () => {
    const r = sb4(
      ["not_very_high_fire_zone", "not_special_flood_hazard_area", "not_regulatory_floodway"].map(
        (id) => check(id, reading("Pass", "hazard_map")),
      ),
    );
    expect([r.statusLabel, r.level]).toEqual(["Check 11", "Not enough data"]);
  });
  it("SB 4 in a flood hazard area", () => {
    const r = sb4([check("not_special_flood_hazard_area", reading("Fail", "hazard_map"))]);
    expect([r.status, r.level]).toEqual(["Red flag", "High"]);
  });
});

describe("normalizing a test", () => {
  const fireTest = TEST_CATALOG.not_very_high_fire_zone;
  const renterTest = TEST_CATALOG.no_renter_last_3_years;

  it("R1: no data, errors and timeouts are Unknown, never Pass", () => {
    expect(normalizeTest(fireTest, undefined, today).outcome).toBe("Unknown");
    for (const failure of ["query_error", "timeout"] as const) {
      const row = normalizeTest(fireTest, { testId: fireTest.id, readings: [], failure }, today);
      expect([row.outcome, row.rule]).toEqual(["Unknown", "R1"]);
    }
  });
  it("R2: a proxy is a lead, even when it says Pass or Fail", () => {
    for (const outcome of ["Pass", "Fail"] as const) {
      const row = normalizeTest(
        fireTest,
        check(fireTest.id, reading(outcome, "land_use", { tier: "proxy" })),
        today,
      );
      expect([row.outcome, row.flag]).toEqual(["Unknown", "lead"]);
    }
  });
  it("R3: a human-only Pass needs a person, but a public Fail stands", () => {
    expect(
      normalizeTest(renterTest, check(renterTest.id, reading("Pass", "parcels")), today).rule,
    ).toBe("R3");
    expect(
      normalizeTest(renterTest, check(renterTest.id, reading("Fail", "parcels")), today).outcome,
    ).toBe("Fail");
  });
  it("R4: zero features is a Pass only with confirmed coverage", () => {
    const empty = reading("Pass", "hazard_map", {}, { zeroFeatures: true });
    expect(normalizeTest(fireTest, check(fireTest.id, empty), today).rule).toBe("R4");
    const covered = { ...empty, coverageConfirmed: true };
    expect(normalizeTest(fireTest, check(fireTest.id, covered), today).outcome).toBe("Pass");
  });
  it("R5: sources that disagree are Unknown and both are shown", () => {
    const row = normalizeTest(
      fireTest,
      check(fireTest.id, reading("Pass", "hazard_map"), reading("Fail", "hazard_map")),
      today,
    );
    expect([row.outcome, row.flag, row.sources.length]).toEqual(["Unknown", "conflict", 2]);
  });
  it("R6: a value near the limit or a sliver overlap is too close to call", () => {
    const near = reading("Pass", "parcels", {}, { measure: { value: 2410, limit: 2400 } });
    const clear = reading("Pass", "parcels", {}, { measure: { value: 2500, limit: 2400 } });
    const sliver = reading("Fail", "hazard_map", {}, { overlapPct: 4 });
    expect(normalizeTest(fireTest, check(fireTest.id, near), today).flag).toBe("borderline");
    expect(normalizeTest(fireTest, check(fireTest.id, clear), today).outcome).toBe("Pass");
    expect(normalizeTest(fireTest, check(fireTest.id, sliver), today).flag).toBe("borderline");
  });
  it("R7: a superseded Pass is Unknown, a superseded Fail stands as stale", () => {
    const old = { superseded: true };
    const pass = normalizeTest(fireTest, check(fireTest.id, reading("Pass", "hazard_map", old)), today);
    const fail = normalizeTest(fireTest, check(fireTest.id, reading("Fail", "hazard_map", old)), today);
    expect([pass.outcome, pass.rule]).toEqual(["Unknown", "R7"]);
    expect([fail.outcome, fail.stale]).toEqual(["Fail", true]);
  });
  it("a row with any sample source counts as sample", () => {
    const row = normalizeTest(
      fireTest,
      check(fireTest.id, reading("Pass", "hazard_map"), reading("Pass", "hazard_map", { sample: true })),
      today,
    );
    expect(row.sample).toBe(true);
  });
});

describe("caps", () => {
  const all = [zone, size, fire, ...human];

  it("a secondary source caps at Medium", () => {
    const secondary = check("zoned_single_family", reading("Pass", "zoning", { tier: "secondary" }));
    expect(sb9([secondary, size, fire, ...human]).level).toBe("Medium");
  });
  it("a law with a verify flag caps at Medium", () => {
    expect(sb9(all, { lawVerify: true }).level).toBe("Medium");
  });
  it("a stale source drops one step, once", () => {
    const old = check("zoned_single_family", reading("Pass", "zoning", { dataAsOf: "2020-01-01" }));
    const older = check("split_lot_size", reading("Pass", "parcels", { dataAsOf: "2020-01-01" }));
    expect(sb9([old, older, fire, ...human]).level).toBe("Medium");
  });
  it("stale rules drop one step", () => {
    expect(sb9(all, { rulesCheckedOn: "2026-01-01" }).level).toBe("Medium");
  });
  it("unknown vintage and future dates count as stale", () => {
    expect(isStale("zoning", null, today)).toBe(true);
    expect(isStale("zoning", "2027-01-01", today)).toBe(true);
    expect(isStale("zoning", "2025-01-01", today)).toBe(false);
  });
});

describe("tests per law", () => {
  it("lists 6 for SB 9 and 14 for SB 4", () => {
    expect(testsForLaw("SB9")).toHaveLength(6);
    expect(testsForLaw("SB4")).toHaveLength(14);
  });
  it("drops the lot split test only when 2 homes or fewer are planned", () => {
    expect(testsForLaw("SB9", { homesPlanned: 2 })).toHaveLength(5);
    expect(testsForLaw("SB9", { homesPlanned: 3 })).toHaveLength(6);
  });
});

describe("the five sample sites", () => {
  const level = (id: string) => sampleConfidence(id)?.level;

  it("never rates above Low", () => {
    for (const parcel of parcels) {
      expect(["Low", "Not enough data"]).toContain(level(parcel.id));
    }
  });
  it("gives Olive Commons no Pass from its sample deed", () => {
    const r = sampleConfidence("olive-commons");
    expect([r?.level, r?.counts.pass]).toEqual(["Not enough data", 0]);
  });
  it("shows Juniper Mews as a Red flag at Low, Medium on real records", () => {
    const r = sampleConfidence("juniper-mews");
    expect([r?.status, r?.level, r?.uncappedLevel]).toEqual(["Red flag", "Low", "Medium"]);
  });
  it("points Olive Commons at its ownership question first", () => {
    expect(sampleConfidence("olive-commons")?.next).toBe(
      TEST_CATALOG.owned_by_qualifying_institution.action,
    );
  });
  it("does not tell a Red flag site that Low means it is not bad", () => {
    const r = sampleConfidence("juniper-mews");
    expect(r && levelBody(r)).toBe(CONFIDENCE_COPY.redFlagLow);
  });
  it("has no result for an unscreened site", () => {
    expect(sampleConfidence(undefined)).toBeUndefined();
  });
});
