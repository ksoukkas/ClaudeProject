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

export const fixtureParcelSource: ParcelSource = {
  async get(id) {
    return SYNTHETIC_PARCELS.find((p) => p.id === id) ?? null;
  },
  async list() {
    return SYNTHETIC_PARCELS.map(({ id, label, city, synthetic }) => ({
      id,
      label,
      city,
      synthetic,
    }));
  },
};

/** Swap this binding to point the report at real data. */
export const parcelSource: ParcelSource = fixtureParcelSource;
