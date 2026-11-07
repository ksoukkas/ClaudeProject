import type { Chapter8Evidence, Chapter8Flag, EvidenceItem, TaxDefaultedParcel } from "./types";

/**
 * ASSUMPTION: a county list older than this many days counts as stale, because
 * owners can redeem until 5 PM the day before an auction (OC Treasurer-Tax
 * Collector page, read 2026-11-07), so rows drop off without notice. No
 * statute gives this number; it is a working choice for the prototype.
 */
export const CHAPTER8_LIST_MAX_AGE_DAYS = 30;

const STATUTE_SOURCES = ["rtc-3692-4", "rtc-3791-4", "rtc-chapter-8"];

/** ISO date one calendar day before the given ISO date, in local time. */
function dayBefore(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Where this parcel sits in the Chapter 8 process. The window language is
 * deliberately careful: the statute sets who may ask and for what, and the
 * county sets the practical cutoff. Neither is restated as a number here.
 */
export function computeChapter8Flag(p: TaxDefaultedParcel, today: Date): Chapter8Flag {
  const base = [p.sourceId, "octtc-tax-auction", ...STATUTE_SOURCES];
  if (p.status === "redeemed-or-sold") {
    return {
      state: "redeemed-or-sold",
      label: "Off the list: redeemed or sold",
      reason: "The county list marks this parcel redeemed, sold or withdrawn. Nothing to request.",
      deadline: null,
      sourceIds: [p.sourceId],
    };
  }
  if (p.status === "scheduled-auction") {
    // The county states that owners may redeem until 5 PM the day before the
    // auction (OC Treasurer-Tax Collector, read 2026-11-07). That is the only
    // cutoff we hold a source for, so it is the one shown.
    const cutoff = p.auctionDate ? dayBefore(p.auctionDate) : null;
    const cutoffPassed = cutoff ? new Date(`${cutoff}T17:00:00`) <= today : null;
    if (cutoffPassed === true) {
      return {
        state: "auction-passed",
        label: "Redemption cutoff passed",
        reason: `The owner's redemption cutoff (5 PM on ${cutoff}, the day before the ${p.auctionDate} auction, per the OC Treasurer-Tax Collector) has passed. Check the county's results: the parcel may have sold, been re-offered or been redeemed.`,
        deadline: cutoff,
        sourceIds: [p.sourceId, "octtc-tax-auction"],
      };
    }
    return {
      state: "request-window-open",
      label: "Listed for auction; ask before the cutoff",
      reason: `Listed for tax auction${p.auctionDate ? ` on ${p.auctionDate}` : ""}. UNVERIFIED legal basis: as this tool understands the Revenue and Taxation Code, a nonprofit may ask the tax collector to withhold a tax-defaulted parcel from auction and buy it by agreement for low-income housing (section 3692.4 was seen only in a search snippet; section 3791.4 was not read). Read both in a browser and ask the tax collector for the county's own request cutoff. The one dated fact held here: the owner may redeem until 5 PM the day before the auction${cutoff ? ` (${cutoff})` : ""}, per the OC Treasurer-Tax Collector.`,
      deadline: cutoff,
      sourceIds: base,
    };
  }
  if (p.status === "power-to-sell") {
    return {
      state: "power-to-sell",
      label: "Power to sell, no auction yet",
      reason:
        "The county list shows its power to sell but no scheduled auction for this parcel. Whether and when a Chapter 8 agreement can be raised before a parcel reaches an auction list is not verified here: ask the tax collector and read the statute (cited UNVERIFIED).",
      deadline: null,
      sourceIds: base,
    };
  }
  return {
    state: "not-known",
    label: "Status not known",
    reason:
      "The pasted row gives no status or auction date, so the parcel's place in the process is unknown. Check the county's published notices.",
    deadline: null,
    sourceIds: [p.sourceId, "octtc-published-notices"],
  };
}

/**
 * Confidence as trust in the evidence: how many Chapter 8 facts the county
 * list actually answered, and how fresh the list is. Never site quality.
 * ASSUMPTION: the level cutoffs (all / at least half / any) are working
 * choices for the prototype.
 */
export function computeChapter8Evidence(p: TaxDefaultedParcel, today: Date): Chapter8Evidence {
  const src = [p.sourceId];
  const items: EvidenceItem[] = [
    { id: "apn", label: "APN usable for matching", resolved: !!p.apnNormalized, value: p.apn ?? "none", sourceIds: src },
    { id: "city", label: "City given", resolved: !!p.city, value: p.city ?? "none", sourceIds: src },
    { id: "status", label: "Process status given", resolved: p.status !== "unknown", value: p.status, sourceIds: src },
    { id: "auction", label: "Auction date given", resolved: !!p.auctionDate, value: p.auctionDate ?? "none", sourceIds: src },
    { id: "default-year", label: "Default year given", resolved: p.defaultYear !== null, value: p.defaultYear?.toString() ?? "none", sourceIds: src },
    { id: "min-bid", label: "Minimum bid given", resolved: p.minBid !== null, value: p.minBid !== null ? `$${p.minBid.toLocaleString("en-US")}` : "none", sourceIds: src },
    { id: "use", label: "Use or improvement given", resolved: !!p.useText, value: p.useText ?? "none", sourceIds: src },
    { id: "list-date", label: "List dated", resolved: !!p.listDate, value: p.listDate ?? "undated", sourceIds: src },
  ];
  const resolved = items.filter((i) => i.resolved).length;
  const total = items.length;
  let listAgeDays: number | null = null;
  if (p.listDate) {
    const ms = today.getTime() - new Date(`${p.listDate}T00:00:00`).getTime();
    listAgeDays = Math.max(0, Math.floor(ms / 86_400_000));
  }
  const stale = listAgeDays === null || listAgeDays > CHAPTER8_LIST_MAX_AGE_DAYS;

  let level: Chapter8Evidence["level"];
  if (resolved === total && !stale) level = "High";
  else if (resolved >= total / 2) level = "Medium";
  else if (resolved > 0) level = "Low";
  else level = "Not enough data";

  const note = stale
    ? listAgeDays === null
      ? "The list is undated, so it counts as stale: rows can be redeemed up to the day before an auction."
      : `The list is ${listAgeDays} days old, past the ${CHAPTER8_LIST_MAX_AGE_DAYS}-day working limit (ASSUMPTION). Re-download it before acting.`
    : `The list is ${listAgeDays} days old, within the ${CHAPTER8_LIST_MAX_AGE_DAYS}-day working limit (ASSUMPTION).`;

  return { items, resolved, total, listAgeDays, stale, level, note };
}
