import type { Metadata } from "next";
import Link from "next/link";
import { ResultsWorkspace } from "@/components/results-workspace";
import { Button, Eyebrow, FigmaIcon } from "@/components/ui";
import { EXAMPLE_QUERY, describeQuery, resolveFilters } from "@/lib/filters";
import { allCities } from "@/lib/public-sites";

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

      <ResultsWorkspace initial={initial} understood={understood} ignored={ignored}>
        <Eyebrow>Your search, made explainable</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          A shortlist, with the why.
        </h1>
      </ResultsWorkspace>
    </div>
  );
}
