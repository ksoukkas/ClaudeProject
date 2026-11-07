/**
 * "On the market" flag. Framework-free.
 *
 * Honesty rule: no public source lists private for-sale listings, so the
 * absence of a signal means "not known to be listed", never "off market".
 */

/** One row of the cached Orange County subset of HCD Surplus Land Act notices. */
export interface SurplusNotice {
  id: string;
  parentCase: string;
  agencyType: string;
  agency: string;
  apnRaw: string;
  dateIssued: string | null;
  dateIssuedRaw: string;
  dueDate: string | null;
  dueDateRaw: string;
  status: string;
  noticeUrl: string | null;
  address: string;
  city: string;
  zip: string;
  lon: number | null;
  lat: number | null;
  sizeRaw: string;
  sizeAcres: number | null;
  generalPlanZoning: string;
  existingUse: string;
}

export interface NoticeProvenance {
  dataset: string;
  datasetUrl: string;
  resourceUrl: string;
  license: string;
  resourceLastModified: string;
  fetched: string;
  totalRowsStatewide: number;
  rowsKept: number;
  filter: string;
  columnsDropped: string[];
  derivedFields: string[];
}

export interface NoticeFile {
  provenance: NoticeProvenance;
  notices: SurplusNotice[];
}

/** A listing row the user pasted from their own broker or MLS export. Never fetched by the app. */
export interface UploadedListing {
  apn: string | null;
  apnNormalized: string | null;
  address: string | null;
  city: string | null;
  listedDate: string | null;
  source: string | null;
  /** Columns we did not recognise, kept so nothing is silently dropped. */
  extra: Record<string, string>;
}

export type MarketSignalKind = "public-notice" | "uploaded-listing";

export interface MarketSignal {
  kind: MarketSignalKind;
  /** Normalised APN when one could be read, else null. */
  apnNormalized: string | null;
  label: string;
  detail: string;
  /** For public notices: Active, Archive or another status string from the source. */
  status: string | null;
  date: string | null;
  sourceId: string;
  url: string | null;
}

export type OnMarketState =
  | "public-notice-active"
  | "public-notice-archived"
  | "uploaded-listing"
  | "not-known";

export interface OnMarketFlag {
  state: OnMarketState;
  label: string;
  reason: string;
  signals: MarketSignal[];
  sourceIds: string[];
}
