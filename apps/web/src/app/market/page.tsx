import type { Metadata } from "next";
import Link from "next/link";
import { Chapter8Pipeline } from "@/components/chapter8/chapter8-pipeline";
import { PageShell } from "@/components/page-shell";
import { listSource } from "@/lib/chapter8/county-list";
import { FOCUS_LABEL } from "@/lib/focus";

export const metadata: Metadata = { title: "Update the county list" };

export default function MarketPage() {
  return (
    <PageShell
      title="Update the county list"
      description={`The scout runs on the county's ${listSource.auctionDate} list. When the Treasurer-Tax Collector publishes a newer one, paste it here to flag every parcel in ${FOCUS_LABEL}.`}
    >
      <p className="text-sm text-ink-soft">
        Download the list from the{" "}
        <a href={listSource.url} target="_blank" rel="noreferrer" className="underline">
          county&apos;s auction page
        </a>{" "}
        (spreadsheet for registered users, or transcribe the published notice), then paste the CSV.
        Owner and assessee columns are dropped on sight and homes get their address withheld. The
        ranked list lives on the{" "}
        <Link href="/chapter8" className="underline">
          Chapter 8 scout
        </Link>
        .
      </p>
      <Chapter8Pipeline />
    </PageShell>
  );
}
