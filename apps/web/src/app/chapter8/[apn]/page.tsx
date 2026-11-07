import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chapter8Checklist } from "@/components/chapter8-checklist";
import { ConfidenceBreakdown } from "@/components/confidence-breakdown";
import { Eyebrow } from "@/components/ui";
import { assessParcel, findParcel, listSource, money, typeLabel } from "@/lib/chapter8";

type Params = Promise<{ apn: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { apn } = await params;
  return { title: `Parcel ${apn} · Chapter 8` };
}

export default async function Chapter8ParcelPage({ params }: { params: Params }) {
  const { apn } = await params;
  const parcel = findParcel(apn);
  if (!parcel) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const result = assessParcel(parcel, today);

  const facts = [
    ["City", parcel.city],
    ["Type", typeLabel[parcel.propertyType]],
    ["Tax-defaulted on", parcel.taxDefaultedOn],
    ["Power to sell from", parcel.powerToSellOn],
    ["Minimum bid, 2025 auction", money(parcel.minimumBid)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-7 px-6 pt-8 pb-12 lg:px-14">
      <Link href="/chapter8" className="text-[11px] leading-[1.5] text-accent hover:underline">
        ← All tax-defaulted parcels
      </Link>
      <div className="flex flex-col gap-2">
        <Eyebrow>Chapter 8 agreement sale</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          Parcel {parcel.apn}
        </h1>
        <dl className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-5">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-[11px] text-ink-soft">{label}</dt>
              <dd className="text-[14px] font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ConfidenceBreakdown
        result={result}
        sourceNote={
          <>
            Evidence:{" "}
            <a href={listSource.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              County of Orange Treasurer-Tax Collector, Exhibit I, Sale #1398 ↗
            </a>
            , the list for the June 25, 2025 auction, fetched {listSource.fetchedOn}. Street
            address withheld. Prototype, not legal advice.
          </>
        }
      />

      <Chapter8Checklist />
    </div>
  );
}
