/**
 * ASSUMPTION: every number in this file is a working choice made for the
 * prototype. No statute gives any of them. They were picked to be easy to
 * explain and are documented on /about and in apps/web/README.md. Change them
 * here and nowhere else.
 */
import type { SourceKind } from "./types";

/** ASSUMPTION: share of public tests answered to reach Medium. */
export const MEDIUM_COVERAGE = 0.75;

/** ASSUMPTION: share of public tests answered to reach Low. Below this: Not enough data. */
export const LOW_COVERAGE = 1 / 3;

/** ASSUMPTION: a value within this percent of its limit is too close to call. */
export const BORDERLINE_PCT = 2;

/** ASSUMPTION: an overlap up to this percent of parcel area is a sliver. */
export const SLIVER_PCT = 5;

/**
 * ASSUMPTION: how old a source can be before it counts as stale. `null` means
 * the plan sets no limit for that kind of source. An undated source is still
 * stale, because unknown vintage counts as stale.
 */
export const MAX_AGE: Record<SourceKind, { days: number } | { months: number } | null> = {
  surplus_notice: { days: 90 },
  parcels: { months: 24 },
  footprints: { months: 24 },
  zoning: { months: 36 },
  land_use: { months: 36 },
  hazard_map: { months: 60 },
  human_confirmation: { days: 365 },
  law_rules: { days: 180 },
  title_document: null,
};

/**
 * ASSUMPTION: raw score per test. The plan does not state the weights. These
 * are the only linear weights that give all of its expected scores (6, 1.5, 0
 * and -1.5). The score is not used for rank in this slice.
 */
export const SCORE = { pass: 1, unknown: -0.5, fail: -2 } as const;
