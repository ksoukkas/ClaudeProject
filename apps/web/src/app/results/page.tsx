import type { Metadata } from "next";
import Link from "next/link";
import { ResultsWorkspace } from "@/components/results-workspace";
import { ScoutCriteria } from "@/components/scout-criteria";
import { Button, Eyebrow, FigmaIcon } from "@/components/ui";
import { runScout } from "@/lib/scout/scout";
import { scoutSources } from "@/lib/scout/sources";

export const metadata: Metadata = { title: "Results" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const asked = first(params.q).trim();
  const query = asked || "Anaheim, 40+ affordable units, near transit";

  // Only run the live scout for a real search. runScout never throws.
  const scout = asked ? await runScout(asked) : null;
  const live = scout && scout.status === "ok" && scout.candidates.length ? scout : null;
  const he = scoutSources["scag-he"];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-8 lg:px-12">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex flex-1 items-center gap-2 text-[11px] leading-[1.5] text-accent"
        >
          <FigmaIcon src="/figma/results/arrowLeft.svg" size={14} />
          Back to Scout
        </Link>
        <Button
          icon="/figma/results/bellPlus.svg"
          disabled
          title="Prototype: saved searches and alerts are not wired up yet"
        >
          Save search &amp; set alert
        </Button>
      </div>

      <div className="flex flex-col gap-[10px]">
        <Eyebrow>Your search, made explainable</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          A shortlist, with the why.
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink-soft">{query}</p>
        {scout ? <ScoutCriteria criteria={scout.criteria} parser={scout.parser} /> : null}
        {live ? (
          <p className="text-[11px] leading-[1.5] text-muted">
            <a href={he.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Live public data · SCAG housing element sites (checked {he.checked})
            </a>{" "}
            · prototype, not legal advice. Ownership, hazards and utilities are not in these data and
            show as unknown.
          </p>
        ) : scout ? (
          <p className="rounded-[10px] bg-review-soft px-4 py-3 text-[12px] leading-[1.5] text-review">
            Live data unavailable: {(scout.reason ?? "no results").replace(/\.?$/, ".")} Showing
            fictional samples below.
            {scout.status === "city-not-in-layer" ? (
              <>
                {" "}
                <a
                  href={scoutSources["hcd-sites"].url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  HCD sites inventory ↗
                </a>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-[11px] leading-[1.5] text-muted">
            Sample results: the same five fictional sites show for every search. Expanded to 5
            nearby cities. Smaller sites are shown as alternatives, not goal matches. Run a search
            from Scout to see live public data.
          </p>
        )}
      </div>

      <ResultsWorkspace live={live ?? undefined} />
    </div>
  );
}
