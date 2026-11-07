"use client";

import Link from "next/link";
import { useState } from "react";
import { FigmaIcon } from "@/components/ui";
import { EXAMPLE_QUERY } from "@/lib/filters";

/*
 * Each goal is a query the Results page already understands (see parseQuery
 * in lib/filters.ts): "faith" sets the owner filter, "commercial" the owner,
 * "small"/"infill" the lot-size cap.
 */
const examples = ["Faith-owned land", "Commercial corridors", "Small infill sites"];

/** The "Find lots in [city] for [goal]" prompt. Submits a GET to /results. */
export function ScoutPrompt() {
  const [query, setQuery] = useState(EXAMPLE_QUERY);

  return (
    <div className="flex w-full flex-col gap-[14px]">
      <form
        action="/results"
        method="get"
        className="flex w-full flex-col gap-3 rounded-[16px] border border-line bg-surface p-5 shadow-[0_6px_20px_rgba(0,0,0,0.05)]"
      >
        <label
          htmlFor="scout-query"
          className="text-[10px] leading-[1.5] font-semibold text-muted"
        >
          Find lots in [city] for [goal]
        </label>
        <div className="flex flex-col gap-[14px] sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-[14px]">
            <FigmaIcon src="/figma/scout/sparkles.svg" size={20} />
            <input
              id="scout-query"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[19px] leading-[1.5] text-ink outline-none placeholder:text-muted"
              placeholder="Anaheim, 40+ affordable units, near transit"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-accent bg-accent px-[18px] text-[13px] font-semibold text-white hover:bg-[#0066d6]"
          >
            <FigmaIcon src="/figma/scout/arrowRight.svg" size={16} />
            Scout sites
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] leading-[1.5] text-step-muted">Or start with</span>
        {examples.map((example) => (
          <Link
            key={example}
            href={`/results?${new URLSearchParams({ q: example })}`}
            className="rounded-full border border-line bg-canvas px-3 py-[7px] text-[11px] text-step-muted hover:border-accent hover:text-accent"
          >
            {example}
          </Link>
        ))}
      </div>
    </div>
  );
}
