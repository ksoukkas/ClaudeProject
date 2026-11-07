/**
 * Chapter 8 agreement sales. Framework-free.
 *
 * Under California's tax-sale law, a county may sell tax-defaulted property
 * by agreement to a public agency or a nonprofit instead of at public auction
 * (Revenue and Taxation Code, Part 6, Chapter 8; see sources.ts for the
 * citations and their verification status). For a nonprofit building
 * low-income housing, that is a legal path to land before the open market.
 *
 * Nothing here is legal advice. Every verdict is pass / fail / unknown.
 */

export type Chapter8Status =
  /** On a published auction list or notice of intent to sell. */
  | "scheduled-auction"
  /** Subject to the tax collector's power to sell, no auction scheduled yet. */
  | "power-to-sell"
  /** Redeemed by the owner, sold, or otherwise off the list. */
  | "redeemed-or-sold"
  | "unknown";

/** One tax-defaulted parcel as the county lists it. Owner names are never stored. */
export interface TaxDefaultedParcel {
  id: string;
  synthetic: boolean;
  apn: string | null;
  apnNormalized: string | null;
  city: string | null;
  /** Site address, or null when withheld because the use reads as a home. */
  situs: string | null;
  situsWithheld: boolean;
  useText: string | null;
  defaultYear: number | null;
  /** Years since the default year as of the list date, when both are known. */
  yearsDelinquent: number | null;
  minBid: number | null;
  auctionDate: string | null;
  status: Chapter8Status;
  /** Date of the list this row came from (ISO), or null. */
  listDate: string | null;
  sourceId: string;
  /** Columns we did not recognise, kept so nothing is silently dropped. */
  extra: Record<string, string>;
}

export type Chapter8FlagState =
  | "request-window-open"
  | "auction-passed"
  | "power-to-sell"
  | "redeemed-or-sold"
  | "not-known";

export interface Chapter8Flag {
  state: Chapter8FlagState;
  label: string;
  reason: string;
  /** The date that closes the window as the county states it, when known. */
  deadline: string | null;
  sourceIds: string[];
}

export interface EvidenceItem {
  id: string;
  label: string;
  resolved: boolean;
  value: string;
  sourceIds: string[];
}

/** Confidence as trust in the evidence, never as site quality. */
export interface Chapter8Evidence {
  items: EvidenceItem[];
  resolved: number;
  total: number;
  /** Days between the list date and today, or null when the list is undated. */
  listAgeDays: number | null;
  /** ASSUMPTION: a list older than CHAPTER8_LIST_MAX_AGE_DAYS counts as stale. */
  stale: boolean;
  level: "High" | "Medium" | "Low" | "Not enough data";
  note: string;
}
