/**
 * Honest confidence. Pure functions: evidence in, status and confidence out.
 * Nothing here reads the clock. Today's date is passed in.
 *
 * Status and confidence are separate questions. Status is what the tests say.
 * Confidence is how much you can trust that. A site can be a Red flag with High
 * confidence.
 *
 * ASSUMPTION: the rule and every threshold it uses are working choices, not
 * law. See `thresholds.ts`.
 */
import {
  BORDERLINE_PCT,
  LOW_COVERAGE,
  MAX_AGE,
  MEDIUM_COVERAGE,
  SCORE,
  SLIVER_PCT,
} from "./thresholds";
import type {
  ConfidenceResult,
  Level,
  RawCheck,
  Reading,
  Source,
  SourceKind,
  TestDef,
  TestRow,
} from "./types";

/** The copy table: all user-facing confidence wording lives here. */
export const CONFIDENCE_COPY = {
  badge: {
    High: "High confidence",
    Medium: "Medium confidence",
    Low: "Low confidence",
    "Not enough data": "Not enough data",
  } satisfies Record<Level, string>,
  notScreened: "Not screened yet",
  notScreenedBody: "No tests have been run on this site, so there is nothing to rate.",
  body: {
    High: "Every test has an answer from a current source.",
    Medium: "Most of what public records can answer has an answer, but this is not settled yet.",
    Low: "Low does not mean this is a bad site. It means we do not know enough yet.",
    "Not enough data":
      "Too few tests have answers to rate this site. That does not make it a bad site. It means the checking has not been done.",
  } satisfies Record<Level, string>,
  redFlagHigh:
    "High means we are sure about the problem. It does not mean this is a good site.",
  redFlagMedium:
    "A test failed. Medium means the problem is probably real, but confirm it before acting.",
  redFlagLow:
    "A test failed, but the evidence behind it is weak. Confirm it from a real record before acting.",
  meaning: 'Confidence means "how much can you trust this answer", not "how good is this site".',
  sampleStrip: "Fictional sample. These results come from made-up documents, not real records.",
  uncapped: (level: Level) =>
    `Would be ${level} on real records. Capped at Low because this is fictional sample data.`,
};

/** The plain-language body for a result, including the Red flag wording. */
export function levelBody(result: Pick<ConfidenceResult, "status" | "level">): string {
  if (result.status === "Red flag" && result.level === "High") return CONFIDENCE_COPY.redFlagHigh;
  if (result.status === "Red flag" && result.level === "Medium") return CONFIDENCE_COPY.redFlagMedium;
  if (result.status === "Red flag") return CONFIDENCE_COPY.redFlagLow;
  return CONFIDENCE_COPY.body[result.level];
}

const LEVELS: Level[] = ["Not enough data", "Low", "Medium", "High"];
const rank = (level: Level) => LEVELS.indexOf(level);
const capAt = (level: Level, max: Level): Level => (rank(level) > rank(max) ? max : level);

/** "YYYY-MM-DD" to a UTC timestamp, or null when it is not a real date. */
function parseDay(value: string | null | undefined): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? time : null;
}

/** Unknown vintage, or a date in the future, counts as stale. */
export function isStale(kind: SourceKind, dataAsOf: string | null, today: string): boolean {
  const now = parseDay(today);
  if (now === null) throw new Error(`today must be YYYY-MM-DD, got "${today}"`);
  const asOf = parseDay(dataAsOf);
  if (asOf === null || asOf > now) return true;
  const age = MAX_AGE[kind];
  if (age === null) return false;
  const start = new Date(asOf);
  const limit =
    "days" in age
      ? asOf + age.days * 86_400_000
      : Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + age.months, start.getUTCDate());
  return now > limit;
}

function isBorderline(reading: Reading): boolean {
  const { measure, overlapPct } = reading;
  const nearLimit =
    measure !== undefined &&
    Math.abs(measure.value - measure.limit) <= (Math.abs(measure.limit) * BORDERLINE_PCT) / 100;
  const sliver = overlapPct !== undefined && overlapPct > 0 && overlapPct <= SLIVER_PCT;
  return nearLimit || sliver;
}

function latestAsOf(sources: Source[]): string | null {
  const dates = sources
    .map((s) => s.dataAsOf)
    .filter((d): d is string => parseDay(d) !== null)
    .sort();
  return dates.at(-1) ?? null;
}

/** Applies rubric rules R1 to R7 to one test. */
export function normalizeTest(test: TestDef, check: RawCheck | undefined, today: string): TestRow {
  const unknown = (
    rule: TestRow["rule"],
    detail: string,
    sources: Source[] = [],
    flag: TestRow["flag"] = null,
  ): TestRow => ({
    test,
    outcome: "Unknown",
    rule,
    flag,
    detail,
    sources,
    asOf: latestAsOf(sources),
    stale: false,
    sample: sources.some((s) => s.sample === true),
  });

  // R1: no evidence, query error, timeout.
  if (check?.failure === "timeout") return unknown("R1", "The data source timed out.");
  if (check?.failure === "query_error") return unknown("R1", "The data source returned an error.");
  const readings = check?.readings ?? [];
  if (readings.length === 0) return unknown("R1", "No evidence yet.");

  // R2: a proxy is a lead. It never answers a test and never counts as a disagreement.
  const direct = readings.filter((r) => r.source.tier !== "proxy");
  if (direct.length === 0) {
    return unknown(
      "R2",
      readings[0].note ?? "This is a proxy, so it is a lead and not an answer.",
      readings.map((r) => r.source),
      "lead",
    );
  }

  // A current source outranks a superseded one.
  const current = direct.filter((r) => !r.source.superseded);
  const pool = current.length > 0 ? current : direct;
  const sources = pool.map((r) => r.source);

  // R5: sources disagree. A replaced layer's Fail still gets shown, never dropped silently.
  const oldFail = pool.some((r) => r.outcome === "Pass") && direct.some((r) => r.outcome === "Fail");
  if (new Set(pool.map((r) => r.outcome)).size > 1 || oldFail) {
    return unknown(
      "R5",
      "Sources disagree. Both are shown.",
      direct.map((r) => r.source),
      "conflict",
    );
  }

  const outcome = pool[0].outcome;
  const note = pool[0].note;

  // R3: a human_only Pass needs a human source. A Fail from a public record stands.
  if (
    outcome === "Pass" &&
    test.scope === "human_only" &&
    !pool.some((r) => r.source.tier === "human")
  ) {
    return unknown(
      "R3",
      `${note ? `${note} ` : ""}This test needs a person to confirm it, so it stays Unknown.`,
      sources,
    );
  }

  // R4: zero features is only a Pass if the layer is known to cover the parcel.
  if (outcome === "Pass" && pool.every((r) => r.zeroFeatures && !r.coverageConfirmed)) {
    return unknown(
      "R4",
      "The layer returned nothing here, but nobody has confirmed it covers this parcel.",
      sources,
    );
  }

  // R6: too close to the limit, or a sliver overlap.
  if (pool.some(isBorderline)) {
    return unknown("R6", "Too close to the limit to call.", sources, "borderline");
  }

  // R7: a Pass from a superseded layer proves nothing. A Fail stands, marked stale.
  const superseded = pool.every((r) => r.source.superseded === true);
  if (superseded && outcome === "Pass") {
    return unknown("R7", "This layer has been replaced by a newer one.", sources);
  }

  return {
    test,
    outcome,
    rule: superseded ? "R7" : null,
    flag: null,
    detail: note ?? `${outcome} from the source below.`,
    sources,
    asOf: latestAsOf(sources),
    stale: superseded || sources.some((s) => isStale(s.kind, s.dataAsOf, today)),
    sample: sources.some((s) => s.sample === true),
  };
}

type CapFlags = { sample: boolean; secondary: boolean; verify: boolean; stale: boolean };
/** `applied` says which caps really changed the level, so the UI never claims one that did not. */
type Graded = { level: Level; uncappedLevel: Level; applied: CapFlags };

/** Caps, in order: sample, secondary, verify flag, then one stale drop with a floor of Low. */
function applyCaps(start: Level, flags: CapFlags): Graded {
  const rest = (level: Level) => {
    let next = level;
    const applied = { secondary: false, verify: false, stale: false };
    if (flags.secondary && rank(next) > rank("Medium")) {
      next = "Medium";
      applied.secondary = true;
    }
    if (flags.verify && rank(next) > rank("Medium")) {
      next = "Medium";
      applied.verify = true;
    }
    if (flags.stale && rank(next) > rank("Low")) {
      next = LEVELS[rank(next) - 1];
      applied.stale = true;
    }
    return { next, applied };
  };
  const sample = flags.sample && rank(start) > rank("Low");
  const capped = rest(sample ? capAt(start, "Low") : start);
  return {
    level: capped.next,
    uncappedLevel: rest(start).next,
    applied: { ...capped.applied, sample },
  };
}

const isSecondary = (row: TestRow) => row.sources.some((s) => s.tier === "secondary");

export type ConfidenceInput = {
  tests: TestDef[];
  checks: RawCheck[];
  /** YYYY-MM-DD. Passed in so these functions stay pure. */
  today: string;
  /** The date the law rules were checked. Null counts as stale. */
  rulesCheckedOn: string | null;
  /** The law carries a verify flag, as AB 2011 does. */
  lawVerify?: boolean;
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { tests, checks, today, rulesCheckedOn, lawVerify = false } = input;
  const rows = tests.map((test) =>
    normalizeTest(test, checks.find((c) => c.testId === test.id), today),
  );

  const fails = rows.filter((r) => r.outcome === "Fail");
  const passes = rows.filter((r) => r.outcome === "Pass");
  const unknowns = rows.filter((r) => r.outcome === "Unknown");
  const publicRows = rows.filter((r) => r.test.scope === "public");
  const answeredPublic = publicRows.filter((r) => r.outcome !== "Unknown");
  const coverage = publicRows.length > 0 ? answeredPublic.length / publicRows.length : null;
  const openGates = rows.filter((r) => r.test.gate && r.outcome === "Unknown");
  const rulesStale = isStale("law_rules", rulesCheckedOn, today);

  let graded: Graded;
  if (fails.length > 0) {
    // Each Fail stands on its own evidence. Keep the best grade of each kind.
    const grades = fails.map((row) =>
      applyCaps("High", {
        sample: row.sample,
        secondary: isSecondary(row),
        verify: lawVerify,
        stale: row.stale || rulesStale,
      }),
    );
    const top = grades.reduce((a, b) => (rank(a.level) >= rank(b.level) ? a : b));
    const uncappedLevel = grades
      .map((g) => g.uncappedLevel)
      .reduce((a, b) => (rank(a) >= rank(b) ? a : b));
    graded = { ...top, uncappedLevel };
  } else {
    let start: Level;
    if (rows.length === 0 || openGates.length > 0) start = "Not enough data";
    else if (unknowns.length === 0) start = "High";
    else if (coverage !== null && coverage >= MEDIUM_COVERAGE) start = "Medium";
    else if (coverage !== null && coverage >= LOW_COVERAGE) start = "Low";
    else start = "Not enough data";
    graded = applyCaps(start, {
      sample: passes.some((r) => r.sample),
      secondary: passes.some(isSecondary),
      verify: lawVerify,
      stale: passes.some((r) => r.stale) || rulesStale,
    });
  }

  const status: ConfidenceResult["status"] =
    fails.length > 0
      ? "Red flag"
      : rows.length === 0 || unknowns.length > 0
        ? "Check"
        : "Looks good";

  const base = {
    status,
    statusLabel: status === "Check" ? `Check ${unknowns.length}` : status,
    level: graded.level,
    uncappedLevel: graded.uncappedLevel,
    coverage,
    score:
      passes.length * SCORE.pass + fails.length * SCORE.fail + unknowns.length * SCORE.unknown,
    counts: {
      total: rows.length,
      pass: passes.length,
      fail: fails.length,
      unknown: unknowns.length,
    },
    rows,
  };

  return {
    ...base,
    ...explain({
      level: base.level,
      rows,
      publicCount: publicRows.length,
      answeredPublic: answeredPublic.length,
      openGates,
      rulesStale,
      applied: graded.applied,
    }),
  };
}

function explain(r: {
  level: Level;
  rows: TestRow[];
  publicCount: number;
  answeredPublic: number;
  openGates: TestRow[];
  rulesStale: boolean;
  applied: CapFlags;
}): Pick<ConfidenceResult, "why" | "raise" | "next"> {
  const why: string[] = [];
  const raise: string[] = [];
  const fails = r.rows.filter((x) => x.outcome === "Fail");
  const answered = r.rows.filter((x) => x.outcome !== "Unknown");
  const openPublic = r.rows.filter((x) => x.outcome === "Unknown" && x.test.scope === "public");
  const openHuman = r.rows.filter((x) => x.outcome === "Unknown" && x.test.scope === "human_only");
  const counted = fails.length > 0 ? fails : answered;
  const sample = counted.some((x) => x.sample);
  const stale = counted.some((x) => x.stale);

  if (fails.length > 0) {
    why.push(
      `${plural(fails.length, "test")} failed: ${fails.map((x) => x.test.label).join("; ")}. Confidence here is about that problem, so open tests do not lower it.`,
    );
  } else {
    const verb = openHuman.length === 1 ? "needs" : "need";
    const people =
      openHuman.length > 0 ? ` ${plural(openHuman.length, "test")} also ${verb} a person.` : "";
    why.push(`${r.answeredPublic} of ${plural(r.publicCount, "public test")} answered.${people}`);
    if (r.openGates.length > 0) {
      why.push(
        `This site cannot be rated until these are answered: ${r.openGates.map((x) => x.test.label).join("; ")}.`,
      );
    }
  }
  const { applied } = r;
  if (applied.sample) why.push("The evidence is fictional sample data, which caps confidence at Low.");
  if (applied.secondary) why.push("A secondary source caps confidence at Medium.");
  if (applied.verify) {
    why.push("This law's rule summary is flagged for verification, which caps confidence at Medium.");
  }
  if (applied.stale && stale) {
    why.push("A source is past its age limit or states no date, which lowers confidence one step.");
  }
  if (applied.stale && r.rulesStale) {
    why.push("Our law rules are past their age limit, which lowers confidence one step.");
  }

  if (r.level !== "High") {
    if (fails.length > 0) {
      raise.push("Confirm the failed test from a current, real record.");
    } else {
      for (const gate of r.openGates) raise.push(`${gate.test.action}.`);
      const remaining = openPublic.filter((x) => !x.test.gate).length;
      if (remaining > 0) raise.push(`Answer the ${plural(remaining, "open public test")}.`);
      if (openHuman.length > 0) raise.push(`Have a person confirm ${plural(openHuman.length, "test")}.`);
    }
    if (sample) raise.push("Replace the fictional sample documents with real records.");
    if (applied.secondary) raise.push("Confirm the answer from an official source.");
    if (applied.stale && stale) raise.push("Use sources that state a current date.");
    if (applied.stale && r.rulesStale) raise.push("Re-check the law rules.");
    if (applied.verify) raise.push("Verify the current rule against the statute and state guidance.");
  }

  const nextRow =
    fails[0] ??
    r.openGates[0] ??
    r.rows.find((x) => x.rule === "R3") ??
    openPublic.find((x) => !x.test.layerGap) ??
    openPublic[0] ??
    openHuman[0];
  const next = nextRow
    ? nextRow.test.action
    : "Nothing open. Have a professional review before any decision";

  return { why, raise, next };
}
