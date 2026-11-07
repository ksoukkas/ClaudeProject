import type { Metadata } from "next";
import Link from "next/link";
import { ResultsWorkspace } from "@/components/results-workspace";
import { Button, Eyebrow, FigmaIcon } from "@/components/ui";

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
  const query =
    first(params.q).trim() || "Anaheim, 40+ affordable units, near transit";

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
        <p className="text-[11px] leading-[1.5] text-muted">
          Sample results: the same five fictional sites show for every search.
          Expanded to 5 nearby cities. Smaller sites are shown as alternatives,
          not goal matches.
        </p>
      </div>

      <ResultsWorkspace />
    </div>
  );
}
