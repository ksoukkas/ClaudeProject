import Link from "next/link";
import { StatusTag, feasibilityLabel } from "@/components/ui";
import { ASSUMPTIONS } from "@/lib/scout/config";
import { scoutSources } from "@/lib/scout/sources";
import type { Observation, ScoutCandidate, ScoutResult, TransitFact } from "@/lib/scout/types";

/*
 * Live scout results. No hooks, so it renders inside the client
 * ResultsWorkspace or on its own. Every fact shows where it came from;
 * every gap says "unknown".
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

/**
 * Honest geography: parcel centroids plotted by real longitude/latitude
 * (equirectangular, scaled by cos(latitude)). No basemap, no invented pins.
 */
function CentroidPlot({ candidates, query }: { candidates: ScoutCandidate[]; query: string }) {
  const pts = candidates.filter((c) => c.centroid);
  if (pts.length < 2) return null;
  const lons = pts.map((c) => c.centroid![0]);
  const lats = pts.map((c) => c.centroid![1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = lons.map((x) => x * k);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...lats), Math.max(...lats)];
  const span = Math.max(x1 - x0, y1 - y0) || 0.01;
  const W = 400;
  const pad = 24;
  const scale = (W - 2 * pad) / span;
  const H = Math.max(160, (y1 - y0) * scale + 2 * pad);
  const kmAcross = span * 111.32;

  return (
    <figure className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Relative positions of the ranked sites">
        <rect x="0" y="0" width={W} height={H} rx="8" className="fill-canvas" />
        {pts.map((c) => {
          const cx = pad + (c.centroid![0] * k - x0) * scale;
          const cy = H - pad - (c.centroid![1] - y0) * scale;
          return (
            <a key={c.id} href={liveHref(c, query)} aria-label={`${c.rank}. APN ${c.apn}`}>
              <circle cx={cx} cy={cy} r="11" className="fill-review stroke-white" strokeWidth="2" />
              <text x={cx} y={cy + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
                {c.rank}
              </text>
            </a>
          );
        })}
      </svg>
      <figcaption className="text-[10px] leading-[1.5] text-muted">
        Relative positions of parcel centroids from SCAG geometry (WGS84), about {kmAcross.toFixed(1)} km
        across. No basemap: this is a position plot, not a map. North is up.
      </figcaption>
    </figure>
  );
}

function CandidateCard({ c, query, goal }: { c: ScoutCandidate; query: string; goal: number | null }) {
  return (
    <article className="flex flex-col gap-[10px] rounded-[12px] border border-line bg-surface p-5">
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
        <p className="text-[10px] leading-[1.5] text-muted">
          Low confidence · SCAG housing element listing ({c.capacity.year ?? "year unknown"}); nothing checked on site
        </p>
        <Link href={liveHref(c, query)} className="text-[11px] font-semibold text-accent hover:underline">
          Site details →
        </Link>
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

export function ScoutResults({ result }: { result: ScoutResult }) {
  const { candidates, criteria } = result;
  const meets = candidates.filter((c) => c.meetsGoal === true).length;
  return (
    <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:w-[440px] lg:shrink-0">
        <CentroidPlot candidates={candidates} query={result.query} />
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
            Each site below is in its city&apos;s adopted housing element inventory, as published by
            SCAG. That says the city counted it toward its housing need. It does not say who owns it,
            whether it is for sale, or which state law applies. Every site starts at &quot;Needs
            review&quot;.
          </p>
        </div>
        <ScoutAssumptions />
        <ScoutSourcesList ids={result.sources} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 leading-[1.5]">
          <p className="text-[12px] font-semibold text-ink">
            Top {candidates.length} of {result.sitesInCity ?? "?"} housing element sites in {criteria.city}
          </p>
          <p className="text-[11px] text-muted">
            {criteria.minUnits ? `${meets} meet the ${criteria.minUnits}-unit goal · ` : ""}Sort: score ↓
          </p>
        </div>
        {candidates.map((c) => (
          <CandidateCard key={c.id} c={c} query={result.query} goal={criteria.minUnits} />
        ))}
        <p className="text-[10px] leading-[1.5] text-muted">
          Capacity is the unit count the city listed in its housing element, not an entitlement or a
          yield estimate. Explanations: {result.explainer.kind === "claude" ? `Claude (${result.explainer.model})` : "template"}
          {result.explainer.note ? ` · ${result.explainer.note}` : ""}. Generated {result.generatedAt}.
          Prototype, not legal or financial advice.
        </p>
      </div>
    </div>
  );
}
