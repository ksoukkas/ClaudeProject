/**
 * Scout types. Framework-free and serializable (they cross from server to
 * client components and out of /api/scout as JSON).
 *
 * Every parcel fact is an Observation: a value plus the source it came from,
 * or "unknown". This mirrors the per-fact sourceId / tri-state idea used on
 * the feasibility-report branch.
 */
import type { LawId } from "../sample-data";
import type { OcCity } from "./cities";
import type { SourceId } from "./sources";

export type OwnerHint = "faith" | "public" | "commercial";
export type IncomeLevel = "lower" | "moderate";

/** What the user asked for. Parsing only: never facts about a site. */
export type Criteria = {
  city: OcCity | null;
  minUnits: number | null;
  affordability: {
    /** The query asked for affordable / income-restricted homes. */
    mentioned: boolean;
    incomeLevel: IncomeLevel | null;
    /** A stated share, e.g. "20% affordable". */
    sharePercent: number | null;
  };
  nearTransit: boolean | null;
  pathways: LawId[];
  ownerHints: OwnerHint[];
  /** Parts of the query the parser did not turn into criteria. */
  unparsed: string[];
};

export type ParserKind = "claude" | "fallback";

export type ParserInfo = {
  kind: ParserKind;
  /** Model id when kind is "claude". */
  model: string | null;
  /** Why the fallback ran, when it did. */
  reason: string | null;
};

export type Observation<T> =
  | { value: T; sourceId: SourceId; note?: string }
  | { value: "unknown"; sourceId: null; note: string };

export type TransitFact = {
  inHqta: boolean;
  /** Only MPO-planned stops matched, not existing service. */
  plannedOnly: boolean;
  types: string[];
  agencies: string[];
};

export type ScoreComponent = {
  label: string;
  points: number;
  max: number;
  why: string;
};

export type OpenCheck = { label: string; why: string };

export type PathwayLead = { law: LawId; condition: string; sources: string[] };

export type ScoutCandidate = {
  /** Stable id: "he-" + SCAG PID24. */
  id: string;
  rank: number;
  pid24: string;
  /** APN as written in the SCAG layer (Assessor_Parcel_Number). */
  apn: string;
  /** The SCAG layer has no street address. Always null here: "address unknown". */
  address: null;
  city: OcCity;
  /** [longitude, latitude] of the polygon's centroid, WGS84. */
  centroid: [number, number] | null;
  capacity: {
    lower: number;
    moderate: number;
    aboveModerate: number;
    total: number;
    sourceId: "scag-he";
    year: number | null;
  };
  /** Units counted against the goal, and which capacity field(s) they come from. */
  goalBasis: { units: number; label: string };
  meetsGoal: boolean | null;
  acres: Observation<number>;
  zoning: Observation<string>;
  transit: Observation<TransitFact>;
  score: number;
  scoreParts: ScoreComponent[];
  /** Never "feasible" from a housing-element listing alone. */
  feasibility: "review" | "blocked";
  openChecks: OpenCheck[];
  pathwayLeads: PathwayLead[];
  why: string;
  whySource: "claude" | "template";
  links: { label: string; href: string }[];
};

export type ScoutStatus =
  | "ok"
  | "no-city"
  | "city-not-in-layer"
  | "no-matches"
  | "source-error";

export type ScoutResult = {
  query: string;
  criteria: Criteria;
  parser: ParserInfo;
  status: ScoutStatus;
  /** Plain-language reason when status is not "ok". */
  reason: string | null;
  candidates: ScoutCandidate[];
  /** How many housing-element sites the city has in the layer. */
  sitesInCity: number | null;
  sources: SourceId[];
  warnings: string[];
  explainer: { kind: "claude" | "template"; model: string | null; note: string | null };
  /**
   * True when part of the answer is missing because something failed: a data
   * layer errored or was truncated, or a Claude call failed while a key is
   * set. Degraded results are cached only briefly.
   */
  degraded: boolean;
  generatedAt: string;
};
