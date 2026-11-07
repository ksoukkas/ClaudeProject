import assert from "node:assert/strict";
import { test } from "node:test";
import { deadlineBadge, scoreCandidate, unknownInput, type ScoreInput } from "./chapter8/score";

function best(): ScoreInput {
  return {
    debtPctOfAssessed: 20,
    previouslyUnsoldOrDefaultedPlan: true,
    ownerEstateDissolvedOrUnreachable: true,
    vacantNoOccupants: true,
    slopeOver10Pct: false,
    inFloodZone100yr: false,
    inHighOrVeryHighFire: false,
    inLandslideOrLiquefaction: false,
    contaminationOrOilWellNearby: false,
    allowedUnits: 25,
    onHousingElementList: true,
    transitWithinHalfMile: true,
    groceryWithinHalfMile: true,
    publicSchoolNearby: true,
    highOrHighestResource: true,
    qctOrDda: true,
    prohousingCity: true,
    valuePerUnitVsMedian: "below",
    noSurvivingLiens: true,
    vacantOrLightRehab: true,
    withinWaterSewerService: true,
  };
}

test("every input known and favourable scores 100 and tiers as call this week", () => {
  const s = scoreCandidate(best());
  assert.equal(s.total, 100);
  assert.equal(s.tier, "call-this-week");
  for (const m of s.metrics) assert.equal(m.points, 20, m.name);
  // Water and sewer is always marked to verify, even when known.
  assert.equal(s.verifyCount, 1);
});

test("unknown data scores half points on every line and is marked to verify", () => {
  const s = scoreCandidate(unknownInput());
  const byId = Object.fromEntries(s.metrics.map((m) => [m.id, m]));
  assert.equal(byId.acquisition.points, 10);
  assert.equal(byId.buildability.points, 10);
  assert.equal(byId.yield.points, 11.5);
  assert.equal(byId.funding.points, 10);
  assert.equal(byId.cost.points, 10);
  assert.equal(s.total, 52);
  assert.equal(s.tier, "watch-only");
  for (const m of s.metrics) {
    for (const l of m.lines) {
      if (l.label === "Starting points") continue;
      assert.equal(l.verify, true, `${m.name}: ${l.label}`);
      assert.match(l.reason, /to verify/);
    }
  }
});

test("acquisition debt tiers and yield unit tiers follow the spec", () => {
  const base = unknownInput();
  const at = (pct: number) =>
    scoreCandidate({ ...base, debtPctOfAssessed: pct }).metrics[0].lines[0].points;
  assert.equal(at(15), 8);
  assert.equal(at(10), 4);
  assert.equal(at(4), 1);
  const units = (n: number) =>
    scoreCandidate({ ...base, allowedUnits: n }).metrics[2].lines[0].points;
  assert.equal(units(20), 20);
  assert.equal(units(12), 15);
  assert.equal(units(7), 10);
  assert.equal(units(3), 5);
  assert.equal(units(1), 2);
});

test("housing element bonus is capped at 20 and buildability never goes below 0", () => {
  const capped = scoreCandidate({ ...unknownInput(), allowedUnits: 20, onHousingElementList: true });
  assert.equal(capped.metrics[2].points, 20);
  const worst = scoreCandidate({
    ...unknownInput(),
    slopeOver10Pct: true,
    inFloodZone100yr: true,
    inHighOrVeryHighFire: true,
    inLandslideOrLiquefaction: true,
    contaminationOrOilWellNearby: true,
  });
  assert.equal(worst.metrics[1].points, 0);
});

test("tier thresholds sit at 75 and 55", () => {
  const b = best();
  // Acquisition falls to 1 (debt under 5% still earns +1), funding loses transit (5): 76.
  const s76 = scoreCandidate({
    ...b,
    debtPctOfAssessed: 0,
    previouslyUnsoldOrDefaultedPlan: false,
    ownerEstateDissolvedOrUnreachable: false,
    vacantNoOccupants: false,
    transitWithinHalfMile: false,
  });
  assert.equal(s76.total, 76);
  assert.equal(s76.tier, "call-this-week");
  // Also drop the Prohousing line (2): 74 is worth a look.
  const s74 = scoreCandidate({
    ...b,
    debtPctOfAssessed: 0,
    previouslyUnsoldOrDefaultedPlan: false,
    ownerEstateDissolvedOrUnreachable: false,
    vacantNoOccupants: false,
    transitWithinHalfMile: false,
    prohousingCity: false,
  });
  assert.equal(s74.total, 74);
  assert.equal(s74.tier, "worth-a-look");
  // All unknown is 52: watch only.
  assert.equal(scoreCandidate(unknownInput()).tier, "watch-only");
});

test("deadline badge thresholds: red under 30, orange 30 to 89, green 90 and up, passed, none", () => {
  const today = new Date("2026-11-07T12:00:00");
  const plus = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  assert.equal(deadlineBadge(plus(10), today).tone, "red");
  assert.equal(deadlineBadge(plus(30), today).tone, "orange");
  assert.equal(deadlineBadge(plus(89), today).tone, "orange");
  assert.equal(deadlineBadge(plus(90), today).tone, "green");
  assert.equal(deadlineBadge(plus(-1), today).tone, "passed");
  assert.equal(deadlineBadge(null, today).tone, "none");
});
