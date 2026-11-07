/**
 * Types for the feasibility report. Framework-free.
 *
 * Vocabulary: every test is "pass", "fail" or "unknown". Never a probability.
 * Every test names the requirement it checks, the source for that requirement,
 * the data it used, the value it found and, when unknown, who can resolve it.
 */

export type Verdict = "pass" | "fail" | "unknown";
export type TriState = "yes" | "no" | "unknown";
export type SourceStatus = "VERIFIED" | "UNVERIFIED";

export type SourceKind =
  | "statute"
  | "fact-sheet"
  | "bill-page"
  | "data-layer"
  | "repo-doc"
  | "user-data";

export interface Source {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  /** VERIFIED means the source was fetched and matched the claim. */
  status: SourceStatus;
  /** ISO date the source was checked, or null if it was never fetched. */
  checked: string | null;
  note?: string;
}

export type ZoningCategory =
  | "single-family"
  | "multifamily"
  | "commercial"
  | "mixed-use"
  | "industrial"
  | "public"
  | "other"
  | "unknown";

export interface ZoningObservation {
  sourceId: string;
  /** The code exactly as the source gives it. */
  code: string | null;
  description: string | null;
  /** Our normalised reading of the code. The code above is the truth. */
  category: ZoningCategory;
}

export interface Observation {
  sourceId: string;
  value: TriState;
  detail?: string;
}

export type HazardKey =
  | "veryHighFire"
  | "floodSfha"
  | "faultZone"
  | "wetlands"
  | "farmland"
  | "liquefaction";

/** Several layers may speak to one hazard. Disagreements are surfaced, not resolved. */
export type Hazards = Partial<Record<HazardKey, Observation[]>>;

export type OwnerType = "religious" | "college" | "public" | "private" | "unknown";

export interface OwnerObservation {
  type: OwnerType;
  /** confirmed = deed or Assessor record. proxy = inferred from a worship-site map or the IRS file. */
  basis: "confirmed" | "proxy" | "unknown";
  sourceId?: string;
  detail?: string;
}

export interface CodeExcerpt {
  citation: string;
  url: string | null;
  /** The original text of the local rule. Always shown beside any translation. */
  text: string;
  plainEnglish: string | null;
}

export interface ProjectPlan {
  homes: number | null;
  affordability: "100-lower" | "mixed" | "unknown";
}

/** Everything the rules need to know about one parcel. Unknown is a valid value everywhere. */
export interface ParcelFacts {
  id: string;
  label: string;
  /** True for made-up test parcels. Shown prominently in the UI. */
  synthetic: boolean;
  city: string;
  apn: string | null;
  lotSqft: number | null;
  lotSqftSourceId?: string;
  zoning: ZoningObservation[];
  existingUse: { sourceId: string; value: string } | null;
  vacant: Observation | null;
  buildingCoveragePct: number | null;
  hazards: Hazards;
  inHqta: Observation | null;
  adjacentIndustrial: Observation | null;
  inUrbanizedArea: Observation | null;
  historicDistrict: Observation | null;
  tenantOccupiedLast3Years: Observation | null;
  owner: OwnerObservation;
  perimeterUrbanPct: number | null;
  hoaOrCcrs: Observation | null;
  publicSurplusNotice: Observation | null;
  yearBuilt: number | null;
  localCode: CodeExcerpt | null;
  plan: ProjectPlan;
}

/** Who can turn an unknown into a pass or fail. */
export type Resolver =
  | "city-planning"
  | "owner-or-title"
  | "data-layer"
  | "site-visit"
  | "project-design"
  | "statute";

export interface TestResult {
  id: string;
  requirement: string;
  requirementSourceIds: string[];
  dataSourceIds: string[];
  valueFound: string;
  verdict: Verdict;
  reason: string;
  resolver: Resolver | null;
  /**
   * "repo-sourced" when the requirement wording traces to a document in this
   * repo (docs/background.md, pathways.json, DATA-SOURCES.md). "unverified"
   * when it rests on the author's reading of the law and still has to be
   * checked against the cited fact sheet or statute.
   */
  requirementStatus: "repo-sourced" | "unverified";
}

export type PathwayId = "SB9" | "SB684_SB1123" | "AB2011" | "SB4";

export interface PathwayResult {
  id: PathwayId;
  name: string;
  whatItOpens: string;
  statute: string;
  sourceIds: string[];
  tests: TestResult[];
  notes: string[];
  /** "open" means no failing test, not "eligible". Unknowns may remain. */
  status: "open" | "blocked";
}

export interface Conflict {
  topic: string;
  observations: { sourceId: string; value: string }[];
  note: string;
}

export interface Coverage {
  totalTests: number;
  passed: number;
  failed: number;
  unknown: number;
  resolvedFromUnverifiedSources: number;
  conflicts: number;
}

export interface NextStep {
  resolver: Resolver;
  label: string;
  unknownsResolved: number;
  testIds: string[];
}

export interface TitleFlag {
  label: string;
  reason: string;
  sourceIds: string[];
  /** True when the flag rests on a rule of thumb rather than a sourced fact. */
  assumption: boolean;
}

export interface TitleCheck {
  /** Always unknown. Title is never resolved from public data. */
  verdict: "unknown";
  flags: TitleFlag[];
  notes: string[];
  documentsToRequest: string[];
  draftRequest: string;
}

export interface LawDelta {
  zoningCategories: ZoningCategory[];
  baseZoningNote: string;
  open: PathwayId[];
  blocked: PathwayId[];
}

export interface FeasibilityReport {
  parcel: ParcelFacts;
  generatedAt: string;
  pathways: PathwayResult[];
  delta: LawDelta;
  /** Disagreements between sources about THIS parcel. Counted in coverage. */
  conflicts: Conflict[];
  /** Disagreements that live in the sources themselves, whatever the parcel. Not counted. */
  knownSourceDisagreements: Conflict[];
  coverage: Coverage;
  nextSteps: NextStep[];
  title: TitleCheck;
  sourcesUsed: Source[];
  assumptions: string[];
}
