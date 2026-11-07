/**
 * Cucumber score: five metrics, 20 points each, 100 total. Framework-free.
 *
 * The metric definitions and point values are the team's scoring system
 * (decided 2026-11-07). They are a ranking convention, not law: every number
 * here is an ASSUMPTION in the CLAUDE.md sense and is shown as such.
 *
 * Rules that apply to every metric:
 * - Unknown data scores half the line's points and is marked "to verify".
 * - Water and sewer capacity is always marked "verify with the utility".
 * - Every line carries its reason so the UI can show it next to the points.
 * - Tiers: 75 and up = call this week · 55 to 74 = worth a look · under 55 = watch only.
 * - The Chapter 8 deadline is shown beside the score, never inside it.
 */

/** true / false when known, null when unknown. */
export type Tri = boolean | null;

export interface ScoreInput {
  // 1. Acquisition certainty
  debtPctOfAssessed: number | null;
  previouslyUnsoldOrDefaultedPlan: Tri;
  ownerEstateDissolvedOrUnreachable: Tri;
  vacantNoOccupants: Tri;
  // 2. Buildability (penalties)
  slopeOver10Pct: Tri;
  inFloodZone100yr: Tri;
  inHighOrVeryHighFire: Tri;
  inLandslideOrLiquefaction: Tri;
  contaminationOrOilWellNearby: Tri;
  // 3. Housing yield
  allowedUnits: number | null;
  onHousingElementList: Tri;
  // 4. Funding competitiveness
  transitWithinHalfMile: Tri;
  groceryWithinHalfMile: Tri;
  publicSchoolNearby: Tri;
  highOrHighestResource: Tri;
  qctOrDda: Tri;
  prohousingCity: Tri;
  // 5. Cost and complexity
  valuePerUnitVsMedian: "below" | "about" | "above" | null;
  noSurvivingLiens: Tri;
  vacantOrLightRehab: Tri;
  withinWaterSewerService: Tri;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
  reason: string;
  /** True when the data was unknown (half points) or the rule says always verify. */
  verify: boolean;
}

export interface MetricScore {
  id: "acquisition" | "buildability" | "yield" | "funding" | "cost";
  name: string;
  question: string;
  points: number;
  max: 20;
  lines: ScoreLine[];
}

export type Tier = "call-this-week" | "worth-a-look" | "watch-only";

export interface Score {
  total: number;
  tier: Tier;
  tierLabel: string;
  metrics: MetricScore[];
  /** Number of lines that still need verifying. */
  verifyCount: number;
}

export const TIER_LABELS: Record<Tier, string> = {
  "call-this-week": "Call this week",
  "worth-a-look": "Worth a look",
  "watch-only": "Watch only",
};

/** A yes/no line worth `max` points: full when true, 0 when false, half + verify when unknown. */
function bonus(label: string, value: Tri, max: number, whenTrue: string, whenFalse: string): ScoreLine {
  if (value === true) return { label, points: max, max, reason: `+${max}: ${whenTrue}`, verify: false };
  if (value === false) return { label, points: 0, max, reason: `+0: ${whenFalse}`, verify: false };
  return { label, points: max / 2, max, reason: `+${max / 2}: unknown, half points, to verify`, verify: true };
}

/** A penalty line: subtracts `penalty` when true, nothing when false, half when unknown. Points are negative. */
function penalty(label: string, value: Tri, amount: number, whenTrue: string, whenFalse: string): ScoreLine {
  if (value === true) return { label, points: -amount, max: 0, reason: `−${amount}: ${whenTrue}`, verify: false };
  if (value === false) return { label, points: 0, max: 0, reason: `−0: ${whenFalse}`, verify: false };
  return { label, points: -amount / 2, max: 0, reason: `−${amount / 2}: unknown, half penalty, to verify`, verify: true };
}

function sum(lines: ScoreLine[]): number {
  return lines.reduce((acc, l) => acc + l.points, 0);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function scoreAcquisition(i: ScoreInput): MetricScore {
  const lines: ScoreLine[] = [];
  const d = i.debtPctOfAssessed;
  if (d === null) {
    lines.push({ label: "Debt vs assessed value", points: 4, max: 8, reason: "+4: debt share of assessed value unknown, half points, to verify", verify: true });
  } else if (d >= 15) {
    lines.push({ label: "Debt vs assessed value", points: 8, max: 8, reason: `+8: debt is ${d.toFixed(0)}% of assessed value (15% or more)`, verify: false });
  } else if (d >= 5) {
    lines.push({ label: "Debt vs assessed value", points: 4, max: 8, reason: `+4: debt is ${d.toFixed(0)}% of assessed value (5 to 15%)`, verify: false });
  } else {
    lines.push({ label: "Debt vs assessed value", points: 1, max: 8, reason: `+1: debt is ${d.toFixed(0)}% of assessed value (under 5%)`, verify: false });
  }
  lines.push(bonus("Previously unsold or payment plan defaulted", i.previouslyUnsoldOrDefaultedPlan, 4, "previously offered and unsold, or a payment plan defaulted", "not previously offered, no defaulted plan"));
  lines.push(bonus("Owner is an estate, dissolved business or unreachable", i.ownerEstateDissolvedOrUnreachable, 4, "owner is an estate, a dissolved business or unreachable", "owner is reachable"));
  lines.push(bonus("Vacant land with no occupants", i.vacantNoOccupants, 4, "vacant land, no occupants", "has a building or occupants"));
  return { id: "acquisition", name: "Acquisition certainty", question: "Will this deal actually close?", points: clamp(sum(lines), 0, 20), max: 20, lines };
}

export function scoreBuildability(i: ScoreInput): MetricScore {
  const lines: ScoreLine[] = [
    { label: "Starting points", points: 20, max: 20, reason: "20: every parcel starts at 20", verify: false },
    penalty("Slope over 10%", i.slopeOver10Pct, 4, "slope over 10%", "slope 10% or less"),
    penalty("100-year flood zone", i.inFloodZone100yr, 4, "in the 100-year flood zone", "outside the 100-year flood zone"),
    penalty("High or Very High fire hazard zone", i.inHighOrVeryHighFire, 4, "in a High or Very High fire hazard zone", "not in a High or Very High fire zone"),
    penalty("Landslide or liquefaction zone", i.inLandslideOrLiquefaction, 3, "in a landslide or liquefaction zone", "not in a landslide or liquefaction zone"),
    penalty("Contamination within 500 ft or oil well within 3,200 ft", i.contaminationOrOilWellNearby, 5, "contamination site within 500 ft or active oil well within 3,200 ft", "no contamination site within 500 ft, no active oil well within 3,200 ft"),
  ];
  return { id: "buildability", name: "Buildability", question: "Can housing physically go here?", points: clamp(sum(lines), 0, 20), max: 20, lines };
}

export function scoreYield(i: ScoreInput): MetricScore {
  const lines: ScoreLine[] = [];
  const u = i.allowedUnits;
  if (u === null) {
    lines.push({ label: "Units allowed (lot size × zoned density)", points: 10, max: 20, reason: "+10: units allowed unknown (lot size or density missing), half points, to verify", verify: true });
  } else {
    const pts = u >= 20 ? 20 : u >= 10 ? 15 : u >= 5 ? 10 : u >= 2 ? 5 : u >= 1 ? 2 : 0;
    lines.push({ label: "Units allowed (lot size × zoned density)", points: pts, max: 20, reason: `+${pts}: about ${u} unit${u === 1 ? "" : "s"} allowed`, verify: false });
  }
  lines.push(bonus("On the city's housing element site list", i.onHousingElementList, 3, "on the city's adopted housing element site list", "not on the city's housing element site list"));
  return { id: "yield", name: "Housing yield", question: "How many homes can it hold?", points: clamp(sum(lines), 0, 20), max: 20, lines };
}

export function scoreFunding(i: ScoreInput): MetricScore {
  const lines: ScoreLine[] = [
    bonus("Transit stop within ½ mile", i.transitWithinHalfMile, 5, "transit stop within half a mile", "no transit stop within half a mile"),
    bonus("Large grocery within ½ mile", i.groceryWithinHalfMile, 3, "large grocery store within half a mile", "no large grocery within half a mile"),
    bonus("Public school nearby", i.publicSchoolNearby, 3, "public school nearby", "no public school nearby"),
    bonus("High or Highest Resource area", i.highOrHighestResource, 4, "High or Highest Resource opportunity area", "not a High or Highest Resource area"),
    bonus("Qualified Census Tract or Difficult Development Area", i.qctOrDda, 3, "in a QCT or DDA", "not in a QCT or DDA"),
    bonus("City has a Prohousing designation", i.prohousingCity, 2, "city holds a Prohousing designation", "city has no Prohousing designation"),
  ];
  return { id: "funding", name: "Funding competitiveness", question: "Will funders back a project here?", points: clamp(sum(lines), 0, 20), max: 20, lines };
}

export function scoreCost(i: ScoreInput): MetricScore {
  const lines: ScoreLine[] = [];
  const v = i.valuePerUnitVsMedian;
  if (v === null) lines.push({ label: "Value per possible unit vs nearby median", points: 4, max: 8, reason: "+4: value per unit unknown, half points, to verify", verify: true });
  else if (v === "below") lines.push({ label: "Value per possible unit vs nearby median", points: 8, max: 8, reason: "+8: below the nearby median", verify: false });
  else if (v === "about") lines.push({ label: "Value per possible unit vs nearby median", points: 4, max: 8, reason: "+4: about the nearby median", verify: false });
  else lines.push({ label: "Value per possible unit vs nearby median", points: 0, max: 8, reason: "+0: above the nearby median", verify: false });
  lines.push(bonus("No liens that survive the sale", i.noSurvivingLiens, 5, "no liens survive the sale", "liens survive the sale"));
  lines.push(bonus("Vacant land or light rehab only", i.vacantOrLightRehab, 4, "vacant land, or a building needing only light rehab", "heavy rehab or demolition"));
  const water = bonus("Within water and sewer service area", i.withinWaterSewerService, 3, "within an existing water and sewer service area", "outside the water and sewer service area");
  // Always verify with the utility, whatever the data says.
  lines.push({ ...water, verify: true, reason: `${water.reason}; verify capacity with the utility` });
  return { id: "cost", name: "Cost and complexity", question: "Is it a reasonable deal?", points: clamp(sum(lines), 0, 20), max: 20, lines };
}

export function scoreCandidate(i: ScoreInput): Score {
  const metrics = [scoreAcquisition(i), scoreBuildability(i), scoreYield(i), scoreFunding(i), scoreCost(i)];
  const total = Math.round(metrics.reduce((acc, m) => acc + m.points, 0));
  const tier: Tier = total >= 75 ? "call-this-week" : total >= 55 ? "worth-a-look" : "watch-only";
  const verifyCount = metrics.reduce((acc, m) => acc + m.lines.filter((l) => l.verify).length, 0);
  return { total, tier, tierLabel: TIER_LABELS[tier], metrics, verifyCount };
}

/** All-unknown input: the starting point every adapter fills in from real data. */
export function unknownInput(): ScoreInput {
  return {
    debtPctOfAssessed: null,
    previouslyUnsoldOrDefaultedPlan: null,
    ownerEstateDissolvedOrUnreachable: null,
    vacantNoOccupants: null,
    slopeOver10Pct: null,
    inFloodZone100yr: null,
    inHighOrVeryHighFire: null,
    inLandslideOrLiquefaction: null,
    contaminationOrOilWellNearby: null,
    allowedUnits: null,
    onHousingElementList: null,
    transitWithinHalfMile: null,
    groceryWithinHalfMile: null,
    publicSchoolNearby: null,
    highOrHighestResource: null,
    qctOrDda: null,
    prohousingCity: null,
    valuePerUnitVsMedian: null,
    noSurvivingLiens: null,
    vacantOrLightRehab: null,
    withinWaterSewerService: null,
  };
}

export type DeadlineTone = "red" | "orange" | "green" | "passed" | "none";

export interface DeadlineBadge {
  tone: DeadlineTone;
  symbol: string;
  label: string;
  daysLeft: number | null;
}

/**
 * Shown beside the score, never inside it. 🔴 under 30 days · 🟠 30 to 89 · 🟢 90 and up.
 * ASSUMPTION: exactly 90 days reads as green ("90+").
 */
export function deadlineBadge(deadlineIso: string | null, today: Date): DeadlineBadge {
  if (!deadlineIso) return { tone: "none", symbol: "⚪", label: "No Chapter 8 deadline on record", daysLeft: null };
  const end = new Date(`${deadlineIso}T17:00:00`);
  const days = Math.floor((end.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { tone: "passed", symbol: "⚫", label: `Deadline ${deadlineIso} has passed`, daysLeft: days };
  if (days < 30) return { tone: "red", symbol: "🔴", label: `${days} days left (${deadlineIso})`, daysLeft: days };
  if (days < 90) return { tone: "orange", symbol: "🟠", label: `${days} days left (${deadlineIso})`, daysLeft: days };
  return { tone: "green", symbol: "🟢", label: `${days} days left (${deadlineIso})`, daysLeft: days };
}
