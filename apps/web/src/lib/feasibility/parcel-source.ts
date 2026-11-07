import { getNotice, listNotices, noticeToParcelFacts } from "@/lib/market/notices";
import { SYNTHETIC_PARCELS } from "./fixtures";
import type { ParcelFacts } from "./types";

export type ParcelSummary = Pick<ParcelFacts, "id" | "label" | "city" | "synthetic">;

/**
 * The one seam between the rules and the data. The data layer replaces
 * `parcelSource` with an implementation that reads the public services and
 * returns ParcelFacts. Nothing else in this module needs to change.
 */
export interface ParcelSource {
  get(id: string): Promise<ParcelFacts | null>;
  list(): Promise<ParcelSummary[]>;
}

const summary = ({ id, label, city, synthetic }: ParcelFacts): ParcelSummary => ({
  id,
  label,
  city,
  synthetic,
});

/** Three SYNTHETIC parcels; every value made up. */
export const fixtureParcelSource: ParcelSource = {
  async get(id) {
    return SYNTHETIC_PARCELS.find((p) => p.id === id) ?? null;
  },
  async list() {
    return SYNTHETIC_PARCELS.map(summary);
  },
};

/** Real public land from the cached HCD Surplus Land Act notices (ids `sla-NNN`). */
export const surplusNoticeParcelSource: ParcelSource = {
  async get(id) {
    const n = getNotice(id);
    return n ? noticeToParcelFacts(n) : null;
  },
  async list() {
    return listNotices().map((n) => summary(noticeToParcelFacts(n)));
  },
};

/** Fixtures first, then notices. Swap or extend this to add a real parcel feed. */
export const compositeParcelSource: ParcelSource = {
  async get(id) {
    return (await fixtureParcelSource.get(id)) ?? (await surplusNoticeParcelSource.get(id));
  },
  async list() {
    return [...(await fixtureParcelSource.list()), ...(await surplusNoticeParcelSource.list())];
  },
};

/** Swap this binding to point the report at other data. */
export const parcelSource: ParcelSource = compositeParcelSource;
