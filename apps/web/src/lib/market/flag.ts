import type { MarketSignal, OnMarketFlag } from "./types";

const uniq = <T>(xs: T[]) => Array.from(new Set(xs));

/**
 * Combine whatever signals exist for one parcel into a flag.
 * Precedence: an active public notice, then an uploaded listing, then an
 * archived notice, then "not known". Never "off market": nothing we hold
 * can prove a parcel is not for sale.
 */
export function computeOnMarketFlag(signals: MarketSignal[]): OnMarketFlag {
  const sourceIds = uniq(signals.map((s) => s.sourceId));
  const active = signals.find((s) => s.kind === "public-notice" && s.status === "Active");
  if (active) {
    return {
      state: "public-notice-active",
      label: "Coming to market: active public notice",
      reason: `A local agency has published an active Surplus Land Act notice for this land${active.date ? `, due ${active.date}` : ""}. Affordable-housing sponsors get first notice under the Act; read the notice and the HCD guidelines for the response steps.`,
      signals,
      sourceIds,
    };
  }
  const listing = signals.find((s) => s.kind === "uploaded-listing");
  if (listing) {
    return {
      state: "uploaded-listing",
      label: "Listed for sale, per your upload",
      reason: `Matched a row you pasted (${listing.detail}${listing.date ? `, listed ${listing.date}` : ""}). Siteline did not verify it; the listing is your data.`,
      signals,
      sourceIds,
    };
  }
  const archived = signals.find((s) => s.kind === "public-notice");
  if (archived) {
    return {
      state: "public-notice-archived",
      label: "Was offered: archived public notice",
      reason: `A Surplus Land Act notice for this land is marked ${archived.status ?? "archived"} in the HCD list. The land may have been disposed of, withdrawn or re-noticed; check the agency.`,
      signals,
      sourceIds,
    };
  }
  return {
    state: "not-known",
    label: "Not known to be listed",
    reason:
      "No public notice and no uploaded listing matches this parcel. That is not the same as off market: private listings are not in any public source this tool uses.",
    signals: [],
    sourceIds: [],
  };
}
