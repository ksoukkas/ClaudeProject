import type { Metadata } from "next";
import Link from "next/link";
import { ResultsWorkspace } from "@/components/results-workspace";
import { ScoutCriteria } from "@/components/scout-criteria";
import { Button, Eyebrow, FigmaIcon } from "@/components/ui";
import { EXAMPLE_QUERY, describeQuery, resolveFilters } from "@/lib/filters";
import { allCities } from "@/lib/public-sites";
import { runScout } from "@/lib/scout/scout";
import { scoutSources } from "@/lib/scout/sources";
import type { ScoutResult } from "@/lib/scout/types";

export const metadata: Metadata = { title: "Results" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  // A bare /results shows the Scout example search, as before.
  const source = Object.keys(params).length === 0 ? { q: EXAMPLE_QUERY } : params;
  const initial = resolveFilters(source, allCities);
  const { understood, ignored } = describeQuery(initial, allCities);

  // The live scout runs only for real search text (not the bare example view).
  // runScout never throws; on failure the map and lists below still work.
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const asked = (rawQ ?? "").trim();
  const scout = asked ? await runScout(asked) : null;
  const live = scout && scout.status === "ok" && scout.candidates.length ? scout : null;

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

      <ResultsWorkspace
        initial={initial}
        understood={understood}
        ignored={ignored}
        live={live}
        liveIntro={scout ? <ScoutIntro scout={scout} live={Boolean(live)} /> : null}
      >
        <Eyebrow>Your search, made explainable</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          A shortlist, with the why.
        </h1>
      </ResultsWorkspace>
    </div>
  );
}

/** The live scout's banner and parsed criteria, under main's query line. */
function ScoutIntro({ scout, live }: { scout: ScoutResult; live: boolean }) {
  const he = scoutSources["scag-he"];
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-4">
      <p className="text-[12px] font-semibold text-ink">Live scout</p>
      <ScoutCriteria criteria={scout.criteria} parser={scout.parser} />
      {live ? (
        <p className="text-[11px] leading-[1.5] text-muted">
          <a href={he.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Live public data · SCAG housing element sites (checked {he.checked})
          </a>{" "}
          · prototype, not legal advice. Ownership, hazards and utilities are not in these data and
          show as unknown. The ranked shortlist is above the sample sites; its numbers match the
          square pins on the map.
        </p>
      ) : (
        <p className="rounded-[10px] bg-review-soft px-4 py-3 text-[12px] leading-[1.5] text-review">
          Live scout unavailable: {(scout.reason ?? "no results").replace(/\.?$/, ".")} The map and
          lists below still show the cached public sites and the fictional samples.
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
      )}
    </div>
  );
}
