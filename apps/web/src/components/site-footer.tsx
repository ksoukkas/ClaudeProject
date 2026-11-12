import Link from "next/link";
import { listSource } from "@/lib/chapter8/county-list";
import { FOCUS_LABEL } from "@/lib/focus";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-6 py-4 text-[10px] leading-[1.5] text-muted sm:flex-row sm:items-start sm:gap-2 lg:px-12">
        <p className="flex-1">
          Cucumber is a prototype built at the Claude Impact Lab for {FOCUS_LABEL}. Scores are a
          ranking convention, not law; unknown facts score half points and are marked to verify.
          Chapter 8 statute text is cited as unverified until read in full. Screening only, not
          legal advice: confirm with the county tax collector and a professional before acting.{" "}
          <Link href="/about" className="text-accent hover:underline">
            What is real and what is assumed
          </Link>
        </p>
        <p className="whitespace-nowrap">County list: auction {listSource.auctionDate}</p>
      </div>
      <div className="mx-auto w-full max-w-[1440px] px-6 pb-4 text-[10px] leading-[1.5] text-muted lg:px-12">
        Map: street basemap from OpenFreeMap, data &copy; OpenStreetMap contributors. Aerial imagery: U.S.
        Geological Survey, The National Map (public domain). AI aerial reads describe an image and are not
        a site inspection.
      </div>
    </footer>
  );
}
