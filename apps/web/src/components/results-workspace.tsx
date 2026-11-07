"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { OcMap } from "@/components/oc-map";
import { FigmaIcon, StatusTag, feasibilityLabel } from "@/components/ui";
import { sampleConfidence } from "@/lib/sample-checks";
import {
  type Feasibility,
  type LawId,
  type OwnerType,
  laws,
  parcels,
  sampleCities,
} from "@/lib/sample-data";

type Filters = {
  city: string;
  law: string;
  owner: string;
  size: string;
  market: string;
  feasibility: string;
};

const initialFilters: Filters = {
  city: "all",
  law: "all",
  owner: "all",
  size: "any",
  market: "off",
  feasibility: "all",
};

const filterDefs: {
  key: keyof Filters;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "city",
    label: "City",
    options: [
      { value: "all", label: `${sampleCities.length} cities selected` },
      ...sampleCities.map((c) => ({ value: c, label: c })),
    ],
  },
  {
    key: "law",
    label: "Law",
    options: [
      { value: "all", label: "All pathways" },
      ...(Object.keys(laws) as LawId[]).map((id) => ({
        value: id,
        label: laws[id].name,
      })),
    ],
  },
  {
    key: "owner",
    label: "Owner type",
    options: [
      { value: "all", label: "All owners" },
      ...(["Faith-owned", "Commercial", "Private", "Public"] satisfies OwnerType[]).map(
        (o) => ({ value: o, label: o }),
      ),
    ],
  },
  {
    key: "size",
    label: "Lot size",
    options: [
      { value: "any", label: "Any acreage" },
      { value: "0.5", label: "0.5 acres or more" },
      { value: "1", label: "1 acre or more" },
    ],
  },
  {
    key: "market",
    label: "Market status",
    options: [
      { value: "off", label: "On-market only: Off" },
      { value: "on", label: "On-market only: On" },
    ],
  },
  {
    key: "feasibility",
    label: "Status",
    options: [
      { value: "all", label: "All statuses" },
      ...(Object.keys(feasibilityLabel) as Feasibility[]).map((f) => ({
        value: f,
        label: feasibilityLabel[f],
      })),
    ],
  },
];

export function ResultsWorkspace() {
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState<Set<string>>(new Set(["olive-commons"]));

  const visible = useMemo(
    () =>
      parcels.filter(
        (p) =>
          (filters.city === "all" || p.city === filters.city) &&
          (filters.law === "all" || p.law === filters.law) &&
          (filters.owner === "all" || p.owner === filters.owner) &&
          (filters.size === "any" || p.acres >= Number(filters.size)) &&
          (filters.market === "off" || p.onMarket) &&
          (filters.feasibility === "all" || p.feasibility === filters.feasibility),
      ),
    [filters],
  );

  const count = (f: Feasibility) => visible.filter((p) => p.feasibility === f).length;
  const visibleIds = new Set(visible.map((p) => p.id));

  function toggleSaved(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex w-full flex-col gap-[10px]">
        <div className="grid w-full grid-cols-2 gap-[10px] md:grid-cols-3 xl:grid-cols-6">
          {filterDefs.map((def) => (
            <label
              key={def.key}
              className="relative flex flex-col gap-[3px] rounded-[10px] border border-line bg-surface px-3 py-[9px] focus-within:border-accent"
            >
              <span className="text-[9px] leading-[1.5] text-muted">{def.label}</span>
              <select
                value={filters[def.key]}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, [def.key]: e.target.value }))
                }
                className="w-full cursor-pointer appearance-none bg-transparent pr-4 text-[11px] leading-[1.5] font-medium text-ink outline-none"
              >
                {def.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <FigmaIcon
                src="/figma/results/chevronDown.svg"
                size={12}
                className="pointer-events-none absolute right-3 bottom-[13px]"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] leading-[1.5]">
          <p className="text-ink-soft">
            {visible.length} sample sites · {count("feasible")} look good ·{" "}
            {count("review")} need checking · {count("blocked")} with a red flag
          </p>
          <button
            type="button"
            onClick={() => setFilters(initialFilters)}
            className="text-[10px] text-accent hover:underline"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col lg:w-[612px] lg:shrink-0">
          <OcMap
            variant="results"
            className="rounded-[12px]"
            pins={parcels.map((p) => ({
              rank: p.rank,
              feasibility: p.feasibility,
              href: `/results/${p.id}`,
              label: `${p.rank}. ${p.address}`,
              dimmed: !visibleIds.has(p.id),
            }))}
          />
          <div className="flex items-center gap-5 py-3">
            {(Object.keys(feasibilityLabel) as Feasibility[]).map((f) => (
              <span key={f} className="flex items-center gap-[5px]">
                <span
                  className={`size-[7px] rounded-[4px] ${
                    f === "feasible"
                      ? "bg-feasible"
                      : f === "review"
                        ? "bg-review"
                        : "bg-blocked"
                  }`}
                />
                <span className="text-[10px] leading-[1.5] text-ink-soft">
                  {feasibilityLabel[f]}
                </span>
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-[12px] bg-canvas p-5">
            <p className="font-display text-[14px] leading-[1.2] text-ink">
              A promising law is only the first layer.
            </p>
            <p className="text-[12px] leading-[1.5] text-ink-soft">
              A parcel can pass state-law screening and still face a title
              restriction. Open a report to see the evidence and the unknowns.
            </p>
          </div>
          <p className="py-4 text-[10px] leading-[1.5] text-muted">
            Sample coverage: Anaheim, Santa Ana, Buena Park, Garden Grove and
            Fullerton. Pin numbers match the ranked list.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between leading-[1.5] whitespace-nowrap">
            <p className="text-[12px] font-semibold text-ink">Sites in sample order</p>
            <p className="text-[11px] text-muted">Not ranked by the tests yet</p>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-line bg-surface p-6 text-[12px] text-ink-soft">
              No sample sites match these filters.
            </p>
          ) : null}

          {visible.map((p) => {
            const isSaved = saved.has(p.id);
            const result = sampleConfidence(p.id);
            return (
              <article
                key={p.id}
                className={`relative flex flex-col gap-[10px] rounded-[12px] border bg-surface p-5 transition-colors hover:border-accent ${
                  isSaved ? "border-review" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[7px]">
                    <span className="text-[10px] leading-[1.5] text-muted">
                      {String(p.rank).padStart(2, "0")}
                    </span>
                    <StatusTag tone={p.feasibility}>
                      {result?.statusLabel ?? feasibilityLabel[p.feasibility]}
                    </StatusTag>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaved(p.id)}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? `Unsave ${p.address}` : `Save ${p.address}`}
                    className="relative z-10 rounded p-1 hover:bg-canvas"
                  >
                    <FigmaIcon
                      src={
                        isSaved
                          ? "/figma/results/bookmarkCheck.svg"
                          : "/figma/results/bookmark.svg"
                      }
                      size={16}
                    />
                  </button>
                </div>
                <div className="flex flex-col gap-[3px]">
                  <h2 className="font-display text-[21px] leading-[1.2] font-semibold text-ink">
                    <Link
                      href={`/results/${p.id}`}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {p.address}
                    </Link>
                  </h2>
                  <p className="text-[11px] leading-[1.5] text-ink-soft">
                    {p.city} · {p.acres.toFixed(2)} acres · {p.owner}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag>{laws[p.law].name}</StatusTag>
                  <span className="text-[12px] leading-[1.5] font-semibold text-ink">
                    {p.yieldLabel}
                  </span>
                  {p.belowGoal ? (
                    <span className="text-[10px] leading-[1.5] text-ink-soft">
                      Below 40-unit goal
                    </span>
                  ) : null}
                </div>
                {p.onMarket ? (
                  <div className="flex items-center gap-[7px]">
                    <StatusTag tone="review">On the market</StatusTag>
                    <span className="text-[9px] leading-[1.5] text-review">
                      New law pathway · sample listing
                    </span>
                  </div>
                ) : null}
                <p className="text-[12px] leading-[1.5] text-ink">{p.reasoning}</p>
                <div className="flex items-center gap-[10px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <ConfidenceBadge level={result?.level} />
                      {result ? (
                        <span className="text-[11px] leading-[1.5] text-ink-soft">
                          {result.counts.unknown} of {result.counts.total} tests unknown
                        </span>
                      ) : null}
                    </div>
                    {result ? (
                      <p className="text-[11px] leading-[1.5] text-ink-soft">
                        Next: {result.next}
                      </p>
                    ) : null}
                    <p className="text-[10px] leading-[1.5] text-muted">{p.evidence}</p>
                  </div>
                  <FigmaIcon src="/figma/results/arrowUpRight.svg" size={16} />
                </div>
              </article>
            );
          })}

          <p className="text-[10px] leading-[1.5] text-muted">
            Unit ranges are early capacity estimates, not entitlements. *Red flag
            site shows pre-title screening capacity.
          </p>
        </div>
      </div>
    </>
  );
}
