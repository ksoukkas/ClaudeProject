import Link from "next/link";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { StatusTag, feasibilityLabel } from "@/components/ui";
import { ASSUMPTIONS } from "@/lib/scout/config";
import { scoutSources } from "@/lib/scout/sources";
import type { Observation, ScoutCandidate, ScoutResult, TransitFact } from "@/lib/scout/types";

/*
 * Live scout results. No hooks, so they render inside the client
 * ResultsWorkspace (next to main's map and lists) or on their own. Every fact
 * shows where it came from; every gap says "unknown".
 */

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function acresText(o: Observation<number>): string {
  return o.value === "unknown" ? "acreage unknown" : `${fmt(o.value)} acres`;
}

export function zoningText(o: Observation<string>): string {
  return o.value === "unknown" ? "zoning unknown" : `zone ${o.value}`;
}

export function TransitTag({ transit }: { transit: Observation<TransitFact> }) {
  if (transit.value === "unknown") return <StatusTag tone="review">Transit unknown</StatusTag>;
  if (!transit.value.inHqta) return <StatusTag tone="neutral">Not in a Caltrans HQTA</StatusTag>;
  if (transit.value.plannedOnly) return <StatusTag tone="review">Planned transit stop only</StatusTag>;
  return <StatusTag tone="accent">In Caltrans HQTA</StatusTag>;
}

export function SourceLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 text-[10px] leading-[1.5] text-accent hover:underline"
        >
          View source ↗ <span className="text-muted">{l.label}</span>
        </a>
      ))}
    </span>
  );
}

export function liveHref(c: ScoutCandidate, query: string) {
  return `/results/live/${encodeURIComponent(c.id)}?q=${encodeURIComponent(query)}`;
}

function CandidateCard({
  c,
  query,
  goal,
  mapNumber,
  mapLoaded,
  selected,
  onShowOnMap,
}: {
  c: ScoutCandidate;
  query: string;
  goal: number | null;
  /** Number of this site's square pin on the map, or null when it is not on the map. */
  mapNumber: number | null;
  /** False while the map's public-site snapshot is still loading. */
  mapLoaded: boolean;
  selected: boolean;
  onShowOnMap?: () => void;
}) {
  return (
    <article
      id={`live-${c.id}`}
      className={`flex scroll-mt-6 flex-col gap-[10px] rounded-[12px] border bg-surface p-5 ${
        selected ? "border-accent ring-2 ring-accent/25" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-[7px]">
          <span className="text-[10px] leading-[1.5] text-muted">{String(c.rank).padStart(2, "0")}</span>
          <StatusTag tone={c.feasibility}>{feasibilityLabel[c.feasibility]}</StatusTag>
        </div>
        <span className="text-[10px] leading-[1.5] text-muted">
          Score {fmt(c.score)} / {c.scoreParts.reduce((s, p) => s + p.max, 0)}
        </span>
      </div>
      <div className="flex flex-col gap-[3px]">
        <h2 className="font-display text-[21px] leading-[1.2] font-semibold text-ink">
          <Link href={liveHref(c, query)} className="hover:text-accent">
            APN {c.apn}
          </Link>
        </h2>
        <p className="text-[11px] leading-[1.5] text-ink-soft">
          Address unknown · {c.city} · {acresText(c.acres)} · {zoningText(c.zoning)} · owner unknown
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] leading-[1.5] font-semibold text-ink">
          {fmt(c.goalBasis.units)} units {c.goalBasis.label}
        </span>
        {c.meetsGoal === true ? <StatusTag tone="accent">Meets {goal}-unit goal</StatusTag> : null}
        {c.meetsGoal === false ? <StatusTag tone="line-muted">Below {goal}-unit goal</StatusTag> : null}
        <TransitTag transit={c.transit} />
        <StatusTag tone="line-muted">Pathway: unconfirmed</StatusTag>
      </div>
      <p className="text-[12px] leading-[1.5] text-ink">
        {c.why}{" "}
        <span className="text-[10px] text-muted">
          ({c.whySource === "claude" ? "drafted by Claude from the facts above; verify" : "template from the facts above"})
        </span>
      </p>
      <ul className="flex flex-col gap-[2px] text-[10px] leading-[1.5] text-muted">
        {c.scoreParts.map((p) => (
          <li key={p.label}>
            {p.label}: {fmt(p.points)}/{p.max} · {p.why}
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-[1.5] text-review">
        Unknown: {c.openChecks.map((o) => o.label).join(" · ")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3">
          {/* No pathway tests are run on live sites, so confidence is not rated (honest-confidence rule). */}
          <ConfidenceBadge />
          <span className="text-[11px] leading-[1.5] text-ink-soft">
            Pathway tests not run · {c.openChecks.length} open checks unknown
          </span>
        </div>
        <span className="flex items-center gap-3">
          {onShowOnMap && mapNumber !== null ? (
            <button
              type="button"
              onClick={onShowOnMap}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Show on map (square {mapNumber})
            </button>
          ) : (
            <span className="text-[10px] text-muted">
              {mapLoaded ? "Not in the map snapshot" : "Finding on the map…"}
            </span>
          )}
          <Link href={liveHref(c, query)} className="text-[11px] font-semibold text-accent hover:underline">
            Site details →
          </Link>
        </span>
      </div>
      <SourceLinks links={c.links} />
    </article>
  );
}

export function ScoutAssumptions() {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-5">
      <p className="text-[12px] font-semibold text-ink">Assumptions in this ranking</p>
      <ul className="flex flex-col gap-2">
        {Object.values(ASSUMPTIONS).map((a) => (
          <li key={a.id} className="flex flex-col gap-[2px]">
            <span className="flex flex-wrap items-center gap-2 text-[11px] text-ink">
              <StatusTag tone="review">ASSUMPTION</StatusTag>
              {a.label}
            </span>
            <span className="text-[10px] leading-[1.5] text-muted">{a.basis}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScoutSourcesList({ ids }: { ids: ScoutResult["sources"] }) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-5">
      <p className="text-[12px] font-semibold text-ink">Sources used</p>
      <ul className="flex flex-col gap-3">
        {ids.map((id) => {
          const s = scoutSources[id];
          return (
            <li key={id} className="flex flex-col gap-[2px]">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                {s.name} ↗
              </a>
              <span className="text-[10px] leading-[1.5] text-muted">
                {s.publisher} · {s.status} · checked {s.checked}. {s.how}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The live scout shortlist, shown above main's sample and public lists. The
 * map's numbered squares use the same numbers (see ResultsWorkspace).
 */
export function LiveShortlist({
  result,
  mapIdByCandidate,
  mapLoaded,
  selectedMapId,
  onShowOnMap,
}: {
  result: ScoutResult;
  /** False while the map's public-site snapshot is still loading. */
  mapLoaded: boolean;
  /** Candidate id -> public-site id on the map, for candidates in the map snapshot. */
  mapIdByCandidate: ReadonlyMap<string, number>;
  selectedMapId: number | null;
  onShowOnMap: (publicId: number) => void;
}) {
  const { candidates, criteria } = result;
  const meets = candidates.filter((c) => c.meetsGoal === true).length;
  return (
    <section aria-labelledby="live-shortlist-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id="live-shortlist-heading"
          className="font-display text-[21px] leading-[1.2] font-semibold text-ink"
        >
          Live scout shortlist
        </h2>
        <p className="text-[11px] leading-[1.5] text-ink-soft">
          Top {candidates.length} of {result.sitesInCity ?? "?"} housing element sites in {criteria.city}
          {criteria.minUnits ? ` · ${meets} meet the ${criteria.minUnits}-unit goal` : ""} · sorted by
          score. Same numbers as the square pins on the map.
        </p>
      </div>
      {result.warnings.length ? (
        <div className="flex flex-col gap-1 rounded-[12px] bg-review-soft p-4">
          {result.warnings.map((w) => (
            <p key={w} className="text-[11px] leading-[1.5] text-review">
              {w}
            </p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 rounded-[12px] bg-canvas p-5">
        <p className="font-display text-[14px] leading-[1.2] text-ink">
          A housing element listing is a lead, not a green light.
        </p>
        <p className="text-[12px] leading-[1.5] text-ink-soft">
          Each site is in its city&apos;s adopted housing element inventory, as published by SCAG.
          That says the city counted it toward its housing need. It does not say who owns it,
          whether it is for sale, or which state law applies. Every site starts at &quot;
          {feasibilityLabel.review}&quot;.
        </p>
      </div>
      {candidates.map((c) => {
        const mapId = mapIdByCandidate.get(c.id);
        return (
          <CandidateCard
            key={c.id}
            c={c}
            query={result.query}
            goal={criteria.minUnits}
            mapNumber={mapId !== undefined ? c.rank : null}
            mapLoaded={mapLoaded}
            selected={mapId !== undefined && mapId === selectedMapId}
            onShowOnMap={mapId !== undefined ? () => onShowOnMap(mapId) : undefined}
          />
        );
      })}
      <p className="text-[10px] leading-[1.5] text-muted">
        Capacity is the unit count the city listed in its housing element, not an entitlement or a
        yield estimate. Explanations:{" "}
        {result.explainer.kind === "claude" ? `Claude (${result.explainer.model})` : "template"}
        {result.explainer.note ? ` · ${result.explainer.note}` : ""}. Generated {result.generatedAt}.
        Prototype, not legal or financial advice.
      </p>
      <details className="rounded-[12px] border border-line bg-surface p-4">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink">
          Assumptions and sources behind this shortlist
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <ScoutAssumptions />
          <ScoutSourcesList ids={result.sources} />
        </div>
      </details>
    </section>
  );
}
