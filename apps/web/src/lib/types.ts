/**
 * Shared types live here. Keep this file framework-free so other apps (for
 * example a mobile client) can reuse it later.
 */
export type Id = string;

export type LawId = "SB9" | "SB684_SB1123" | "AB2011" | "SB4";

/** What a test says after the rubric has been applied. */
export type Outcome = "Pass" | "Fail" | "Unknown";

/** How much you can trust the answer. It says nothing about how good the site is. */
export type Level = "High" | "Medium" | "Low" | "Not enough data";

export type SiteStatus = "Red flag" | "Check" | "Looks good";

export type SourceTier = "official" | "secondary" | "proxy" | "human";

/** Picks the maximum age in `thresholds.ts`. `title_document` has no age limit. */
export type SourceKind =
  | "surplus_notice"
  | "parcels"
  | "footprints"
  | "zoning"
  | "land_use"
  | "hazard_map"
  | "human_confirmation"
  | "law_rules"
  | "title_document"
  | "tax_sale_list";

export type Source = {
  name: string;
  tier: SourceTier;
  kind: SourceKind;
  /** The date of the data itself, not the date we fetched it. Null means unknown vintage. */
  dataAsOf: string | null;
  /** True for fictional stand-ins. Sample evidence caps confidence at Low. */
  sample?: boolean;
  /** A newer layer replaces this one. */
  superseded?: boolean;
  url?: string;
};

/** One source's answer to one test, before the rubric is applied. */
export type Reading = {
  outcome: "Pass" | "Fail";
  source: Source;
  /** Plain-language note shown on the row. */
  note?: string;
  /** The Pass came from a spatial query that returned no features. */
  zeroFeatures?: boolean;
  /** Someone confirmed the layer covers this parcel. */
  coverageConfirmed?: boolean;
  /** A measured value and the limit it was compared to, for the borderline band. */
  measure?: { value: number; limit: number };
  /** Share of the parcel inside the zone, in percent, for sliver overlaps. */
  overlapPct?: number;
};

export type RawCheck = {
  testId: string;
  readings: Reading[];
  failure?: "query_error" | "timeout";
};

export type TestGroup =
  | "Zoning and lot"
  | "Ownership and title"
  | "Hazards"
  | "Surroundings"
  | "Land and habitat"
  | "The parcel"
  | "Your organization"
  | "Approvals";

export type TestDef = {
  id: string;
  /** Short plain-language name of what must be true. */
  label: string;
  /** What to do next if this test is open. */
  action: string;
  group: TestGroup;
  /** `human_only` tests need a person. They stay out of the coverage denominator. */
  scope: "public" | "human_only";
  /** An open gate test means the site cannot be rated. */
  gate?: boolean;
  /** No data layer is listed for this test yet. It still counts in coverage. */
  layerGap?: boolean;
};

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";

export type TestRow = {
  test: TestDef;
  outcome: Outcome;
  /** The rubric rule that changed this row, if any. */
  rule: RuleId | null;
  flag: "lead" | "conflict" | "borderline" | null;
  /** Why the row reads the way it does, in plain language. */
  detail: string;
  sources: Source[];
  /** Latest `dataAsOf` among the sources. Null when none is stated. */
  asOf: string | null;
  stale: boolean;
  sample: boolean;
};

export type ConfidenceResult = {
  status: SiteStatus;
  /** "Red flag", "Check 3" or "Looks good". */
  statusLabel: string;
  level: Level;
  /** The level with only the sample cap removed. All other caps still apply. */
  uncappedLevel: Level;
  /** Answered public tests / public tests. Null when the law has no public tests. */
  coverage: number | null;
  /** ASSUMPTION: see SCORE in `thresholds.ts`. Not used for rank in this slice. */
  score: number;
  counts: { total: number; pass: number; fail: number; unknown: number };
  rows: TestRow[];
  /** Plain-language reasons for the level. */
  why: string[];
  /** Plain-language steps that would raise the level. */
  raise: string[];
  /** The single most useful next step. */
  next: string;
};
