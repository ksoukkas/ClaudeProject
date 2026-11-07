import type { Metadata } from "next";
import Link from "next/link";
import { Chapter8Checklist } from "@/components/chapter8-checklist";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Eyebrow, StatusTag } from "@/components/ui";
import { assessParcel, listSource, money, parcels, sortedParcels, typeLabel } from "@/lib/chapter8";

export const metadata: Metadata = { title: "Chapter 8 tax-defaulted land" };
export const dynamic = "force-dynamic";

export default function Chapter8Page() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = sortedParcels().map((parcel) => ({ parcel, result: assessParcel(parcel, today) }));
  const vacant = parcels.filter((p) => p.propertyType === "unimproved").length;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-6 pt-8 pb-12 lg:px-14">
      <div className="flex flex-col gap-3">
        <Eyebrow>Chapter 8 agreement sales · Orange County</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          Tax-defaulted land a nonprofit can apply to buy.
        </h1>
        <p className="max-w-[760px] text-[14px] leading-[1.5] text-ink-soft">
          When a property owner stops paying property tax, the county can sell the parcel. Under
          Chapter 8 of the Revenue and Taxation Code, an eligible nonprofit can apply to buy it by
          agreement with the county instead of bidding at auction.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [String(parcels.length), "parcels on the county's latest published list"],
          [String(vacant), "of them are vacant land"],
          ["June 25, 2025", "auction the list was published for"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col gap-1 rounded-[16px] border border-line bg-surface p-5">
            <p className="font-display text-[28px] leading-[1.2] font-semibold text-ink">{value}</p>
            <p className="text-[12px] leading-[1.5] text-ink-soft">{label}</p>
          </div>
        ))}
      </section>

      <p className="rounded-[12px] bg-canvas px-4 py-3 text-[12px] leading-[1.5] text-ink-soft">
        Real data from the{" "}
        <a href={listSource.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          County of Orange Treasurer-Tax Collector, Exhibit I for Sale #1398 ↗
        </a>
        , fetched {listSource.fetchedOn}. This list is from 2025, so any parcel may since have been
        sold or redeemed. Street addresses are left out because most parcels with a building are
        someone&apos;s home; the parcel number is enough for the tax collector. 154 timeshare
        intervals on the list are left out.
      </p>

      <section className="flex flex-col gap-2">
        <div className="hidden grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_1.4fr] gap-3 px-4 text-[11px] text-ink-soft md:grid">
          <span>Parcel number</span>
          <span>City</span>
          <span>Type</span>
          <span>Power to sell from</span>
          <span>Minimum bid</span>
          <span>Status and confidence</span>
        </div>
        {rows.map(({ parcel, result }) => (
          <Link
            key={parcel.apn}
            href={`/chapter8/${parcel.apn}`}
            className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-[12px] border border-line bg-surface px-4 py-3 text-[13px] leading-[1.5] text-ink hover:border-accent md:grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_1.4fr] md:items-center"
          >
            <span className="font-semibold">{parcel.apn}</span>
            <span>{parcel.city}</span>
            <span className="text-ink-soft">{typeLabel[parcel.propertyType]}</span>
            <span className="text-ink-soft">{parcel.powerToSellOn}</span>
            <span>{money(parcel.minimumBid)}</span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusTag tone={result.status === "Red flag" ? "blocked" : "review"}>
                {result.statusLabel}
              </StatusTag>
              <ConfidenceBadge level={result.level} />
            </span>
          </Link>
        ))}
        <p className="text-[11px] leading-[1.5] text-ink-soft">
          Minimum bids are from the 2025 public auction. A Chapter 8 price is set in the agreement
          with the county and may differ.
        </p>
      </section>

      <Chapter8Checklist />
    </div>
  );
}
