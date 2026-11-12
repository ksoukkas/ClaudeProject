"use client";

import Link from "next/link";
import type { SiteResult } from "@/lib/search/types";
import { StatusTag } from "@/components/ui";
import { PathwayPill } from "./pathway-pill";
import { SOURCE_COLOR, SOURCE_LABEL, acresText } from "./shared";

export function ResultCard({
  site,
  selected,
  onSelect,
  onHover,
}: {
  site: SiteResult;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const located = site.lat != null && site.lon != null;
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        data-result-card
        aria-pressed={selected}
        onClick={() => onSelect(site.id)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(site.id);
          }
        }}
        onMouseEnter={() => onHover(site.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(site.id)}
        onBlur={() => onHover(null)}
        className={`flex cursor-pointer flex-col gap-2 rounded-[12px] border bg-surface p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          selected ? "border-accent bg-accent-soft" : "border-line hover:border-line-field"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[1.6px] text-ink-soft uppercase">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: SOURCE_COLOR[site.source] }}
            />
            {SOURCE_LABEL[site.source]}
          </span>
          {site.score != null ? (
            <span className="text-[11px] font-semibold text-accent">Score {site.score}</span>
          ) : null}
        </div>

        <div>
          <p className="text-[14px] leading-[1.3] font-semibold text-ink">
            {site.address ?? "Address unknown"}
          </p>
          <p className="text-[12px] text-ink-soft">
            {site.city ?? "City unknown"} · APN {site.apn ?? "unknown"} · {acresText(site.acres)}
          </p>
        </div>

        {site.facts.length > 0 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
            {site.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}

        {site.pathways.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {site.pathways.map((p) => (
              <PathwayPill key={p.id} hit={p} />
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 text-[11px]">
          {located ? (
            <span className="text-muted">Click to show on map</span>
          ) : (
            <StatusTag tone="line-muted" shape="pill">
              Not located on the map
            </StatusTag>
          )}
          {site.detailHref ? (
            <Link
              href={site.detailHref}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-accent hover:underline"
            >
              Open details
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function ResultSkeleton() {
  return (
    <li className="flex animate-pulse flex-col gap-2 rounded-[12px] border border-line bg-surface p-3.5">
      <div className="h-2.5 w-28 rounded-full bg-line" />
      <div className="h-4 w-48 rounded-full bg-line" />
      <div className="h-3 w-64 max-w-full rounded-full bg-canvas" />
      <div className="flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-canvas" />
        <div className="h-5 w-24 rounded-full bg-canvas" />
      </div>
    </li>
  );
}
