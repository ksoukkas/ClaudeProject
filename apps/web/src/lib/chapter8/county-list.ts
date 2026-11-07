/**
 * Chapter 8 agreement sales: a nonprofit can apply to buy a tax-defaulted
 * parcel from the county instead of bidding at a public auction. Plain
 * TypeScript, no React.
 *
 * Every parcel goes through the same tests. Only the first two can be
 * answered from the county's published list; the rest need the tax collector
 * or the nonprofit itself, so they stay Unknown until someone confirms them.
 */
import { computeConfidence } from "../confidence";
import type { ConfidenceResult, RawCheck, Source, TestDef } from "../types";
import data from "./tax-defaulted-oc.json";

export type CountyListParcel = {
  apn: string;
  propertyType: "improved" | "unimproved";
  city: string;
  taxDefaultedOn: string;
  powerToSellOn: string;
  minimumBid: number;
};

export const listSource = data.source;
export const parcels = data.parcels as CountyListParcel[];

/** Labels people read. "Improved" means the parcel has a building on it. */
export const typeLabel: Record<CountyListParcel["propertyType"], string> = {
  improved: "Has a building",
  unimproved: "Vacant land",
};

export const CHAPTER8_TESTS: TestDef[] = [
  {
    id: "on_tax_defaulted_list",
    label: "On the county's tax-defaulted sale list",
    action: "Check the parcel is on the county's current list",
    group: "The parcel",
    scope: "public",
    gate: true,
  },
  {
    id: "power_to_sell_started",
    label: "The county's power to sell has started",
    action: "Confirm the power-to-sell date with the Treasurer-Tax Collector",
    group: "The parcel",
    scope: "public",
    gate: true,
  },
  {
    id: "still_unsold",
    label: "Not sold at auction or redeemed by the owner",
    action:
      "Ask the Treasurer-Tax Collector whether it sold at the June 2025 auction or was redeemed",
    group: "The parcel",
    scope: "public",
    layerGap: true,
  },
  {
    id: "nonprofit_eligible",
    label: "Your organization can buy under Chapter 8",
    action: "Confirm your nonprofit qualifies, with your articles of incorporation",
    group: "Your organization",
    scope: "human_only",
  },
  {
    id: "intended_use_qualifies",
    label: "Your intended use qualifies",
    action: "Write the intended-use statement for this parcel",
    group: "Your organization",
    scope: "human_only",
  },
  {
    id: "county_and_controller_approval",
    label: "County board and State Controller approve",
    action: "Get the county board's approval, then the State Controller's",
    group: "Approvals",
    scope: "human_only",
  },
];

const exhibit: Source = {
  name: "OC Treasurer-Tax Collector, Exhibit I, Sale #1398",
  tier: "official",
  kind: "tax_sale_list",
  dataAsOf: listSource.auctionDate,
  url: listSource.url,
};

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Status and confidence for one parcel. `today` is YYYY-MM-DD. */
export function assessParcel(parcel: CountyListParcel, today: string): ConfidenceResult {
  const checks: RawCheck[] = [
    {
      testId: "on_tax_defaulted_list",
      readings: [
        {
          outcome: "Pass",
          source: exhibit,
          note: `Listed as ${parcel.propertyType === "unimproved" ? "vacant land" : "a parcel with a building"}, minimum bid ${money(parcel.minimumBid)} at the June 2025 auction.`,
        },
      ],
    },
    {
      testId: "power_to_sell_started",
      readings: [
        {
          outcome: parcel.powerToSellOn <= today ? "Pass" : "Fail",
          source: exhibit,
          note: `Power to sell from ${parcel.powerToSellOn}.`,
        },
      ],
    },
  ];
  return computeConfidence({ tests: CHAPTER8_TESTS, checks, today, rulesCheckedOn: today });
}

export function findParcel(apn: string): CountyListParcel | undefined {
  return parcels.find((p) => p.apn === apn);
}

/** Vacant land first, then by city and parcel number. */
export function sortedParcels(): CountyListParcel[] {
  const rank = (p: CountyListParcel) => (p.propertyType === "unimproved" ? 0 : 1);
  return [...parcels].sort(
    (a, b) => rank(a) - rank(b) || a.city.localeCompare(b.city) || a.apn.localeCompare(b.apn),
  );
}

export const GUIDE_URL =
  "https://www.sco.ca.gov/Files-ARD-Tax-Info/Tax-Collector-Ref-Man/Chapter8SaleGuide.pdf";

/**
 * The application steps, from the State Controller's guide to the Chapter 8
 * agreement sale package (updated 12/2018). Code sections are the Revenue and
 * Taxation Code sections that guide cites.
 */
export const CHECKLIST: { step: string; cite: string }[] = [
  { step: "Application to purchase tax-defaulted property (SCO form 8-16)", cite: "§§ 3695.4, 3695.5" },
  { step: "Objection letter, if the parcel is scheduled for a public auction", cite: "§§ 3695.4, 3695.5" },
  { step: "Chapter 8 purchase resolution from your governing board", cite: "§ 3695" },
  { step: "Signed agreement to purchase (SCO form 8-13 or 8-15)", cite: "§ 3795" },
  { step: "Your articles of incorporation", cite: "§§ 3772.5, 3795.5" },
  { step: "A list of each parcel and its intended use", cite: "§§ 3772.5, 3695.5" },
  { step: "County Board of Supervisors approves the sale", cite: "§ 3794.3" },
  { step: "State Controller approves the agreement", cite: "§ 3795" },
  {
    step: "County gives notice: mailed 45 to 60 days before the agreement takes effect, published at least 21 days before",
    cite: "§§ 3798, 3799, 3802",
  },
  { step: "Deed recorded once the agreement's terms are met", cite: "§ 3804" },
];
