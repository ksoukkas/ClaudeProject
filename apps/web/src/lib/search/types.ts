// Shared contract between the search backend (src/lib/search, /api/search,
// /api/aerial-read) and the search UI. Change it in one place only.

export type SiteSource = "tax-defaulted" | "surplus-notice" | "housing-element";

export type PathwayStatus = "likely" | "possible" | "unknown" | "no";

export interface PathwayHit {
  /** e.g. "chapter8", "sla", "sb4", "sb9", "sb684", "ab2011" */
  id: string;
  label: string;
  status: PathwayStatus;
  /** One plain sentence. Says "unknown" when the data is silent. */
  reason: string;
  sourceUrl: string | null;
}

export interface SourceRef {
  name: string;
  url: string;
  /** ISO date the source was fetched or checked. */
  checkedAt: string;
}

export interface SiteResult {
  /** Stable id: `${source}:${apn or notice id}` */
  id: string;
  source: SiteSource;
  apn: string | null;
  city: string | null;
  address: string | null;
  /** WGS84. null when the parcel could not be located. */
  lat: number | null;
  lon: number | null;
  acres: number | null;
  /** Short facts for the card, e.g. "Minimum bid $12,400", "Unimproved". */
  facts: string[];
  pathways: PathwayHit[];
  /** 0-100 where a score exists (tax-defaulted list), else null. */
  score: number | null;
  /** In-app link to the fuller page when one exists, else null. */
  detailHref: string | null;
  sourceRef: SourceRef;
  /** Committed AI reading of the aerial image (see data/aerial-reads.json), or null. */
  aerial: { label: AerialLabel; notes: string } | null;
}

export interface SearchParams {
  q?: string;
  city?: string;
  source?: SiteSource;
  /** Pathway id; keeps results whose status for it is "likely" or "possible". */
  pathway?: string;
  /** Keeps sites whose committed AI aerial read has this label. */
  aerial?: AerialLabel;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  total: number;
  results: SiteResult[];
  /** Counts over the full filtered set, for filter chips. */
  facets: {
    source: Record<string, number>;
    city: Record<string, number>;
    /** Keyed by AerialLabel, plus "none" for sites without a committed read. */
    aerial: Record<string, number>;
  };
  sources: SourceRef[];
  warnings: string[];
}

export type AerialLabel =
  | "vacant-lot"
  | "parking-lot"
  | "building-intact"
  | "building-possibly-distressed"
  | "unclear";

/** GET /api/aerial-read?id=<SiteResult.id> */
export interface AerialRead {
  id: string;
  /** false when no API key is configured or the site has no coordinates. */
  available: boolean;
  label: AerialLabel | null;
  /** What the model says it sees, in one or two sentences. */
  notes: string | null;
  model: string | null;
  /** Always shown in the UI: an AI reading of an image, not a site inspection. */
  caveat: string;
  imagery: SourceRef | null;
  readAt: string | null;
}
