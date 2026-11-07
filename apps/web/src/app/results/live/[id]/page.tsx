import type { Metadata } from "next";
import Link from "next/link";
import { SourceLinks, TransitTag, acresText } from "@/components/scout-results";
import { Eyebrow, FigmaIcon, StatusTag, feasibilityLabel } from "@/components/ui";
import { laws } from "@/lib/sample-data";
import { runScout } from "@/lib/scout/scout";
import { scoutSources } from "@/lib/scout/sources";
import type { Observation } from "@/lib/scout/types";

export const metadata: Metadata = { title: "Live site" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function sourceLabel(o: Observation<unknown>): string {
  if (o.sourceId === null) return `Unknown · ${o.note}`;
  const s = scoutSources[o.sourceId];
  return `${s.name} · checked ${s.checked}${o.note ? ` · ${o.note}` : ""}`;
}

function Fact({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[12px] text-ink-soft">{label}</span>
        <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
      </div>
      <span className="text-[10px] leading-[1.5] text-muted">{source}</span>
    </div>
  );
}

/**
 * One live candidate. Re-runs the same search, which is served from the
 * in-memory cache within the hour, and picks the site by id.
 */
export default async function LiveSitePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const q = first((await searchParams).q).trim();
  const result = q ? await runScout(q) : null;
  // Next may or may not have decoded the segment; ids are "he-<digits>", so
  // accept either form and never throw on a malformed escape.
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // keep the raw segment
  }
  const c = result?.candidates.find((x) => x.id === id || x.id === decoded);
  const back = q ? `/results?q=${encodeURIComponent(q)}` : "/results";

  if (!result || !c) {
    return (
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-6 py-10">
        <Link href={back} className="text-[11px] text-accent">
          ← Back to results
        </Link>
        <h1 className="font-display text-[28px] font-bold text-ink">Site not available</h1>
        <p className="text-[13px] leading-[1.5] text-ink-soft">
          This live site is not in the current results for{" "}
          {q ? <>&quot;{q}&quot;</> : "this search"}.
          {result?.reason ? ` ${result.reason}` : ""} Public data may have changed or the service may
          be unreachable. Run the search again from Scout.
        </p>
      </div>
    );
  }

  const he = scoutSources["scag-he"];
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-8 lg:px-12">
      <Link href={back} className="flex items-center gap-2 text-[11px] leading-[1.5] text-accent">
        <FigmaIcon src="/figma/results/arrowLeft.svg" size={14} />
        Back to results
      </Link>

      <div className="flex flex-col gap-2">
        <Eyebrow>Live site · rank {c.rank} for &quot;{result.query}&quot;</Eyebrow>
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink">APN {c.apn}</h1>
        <p className="text-[13px] leading-[1.5] text-ink-soft">
          Address unknown (not in the SCAG layer) · {c.city}
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusTag tone={c.feasibility} solid>
            {feasibilityLabel[c.feasibility]}
          </StatusTag>
          <TransitTag transit={c.transit} />
          <StatusTag tone="line-muted">Pathway: unconfirmed</StatusTag>
        </div>
        <p className="text-[13px] leading-[1.5] text-ink">{c.why}</p>
        <p className="text-[10px] leading-[1.5] text-muted">
          Prototype, not legal or financial advice. A housing element listing is a lead; confirm every
          fact with the city and a professional before acting.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col rounded-[12px] border border-line bg-surface p-5">
          <h2 className="pb-2 text-[14px] font-semibold text-ink">What the public data says</h2>
          <Fact
            label="Lower-income capacity"
            value={`${c.capacity.lower} units`}
            source={`${he.name} · Low_Income_HE_Capacity · ${c.capacity.year ?? "year unknown"} · checked ${he.checked}`}
          />
          <Fact
            label="Moderate-income capacity"
            value={`${c.capacity.moderate} units`}
            source="Moderate_Income_HE_Capacity (same record)"
          />
          <Fact
            label="Above-moderate capacity"
            value={`${c.capacity.aboveModerate} units`}
            source="Above_Moderate_Income_HE_Capacity (same record)"
          />
          <Fact label="Total capacity" value={`${c.capacity.total} units`} source="Total_HE_Capacity (same record)" />
          <Fact label="Size" value={acresText(c.acres)} source={sourceLabel(c.acres)} />
          <Fact
            label="Local zoning code"
            value={c.zoning.value === "unknown" ? "unknown" : c.zoning.value}
            source={sourceLabel(c.zoning)}
          />
          <Fact
            label="High Quality Transit Area"
            value={
              c.transit.value === "unknown"
                ? "unknown"
                : c.transit.value.inHqta
                  ? `yes${c.transit.value.plannedOnly ? " (planned stop only)" : ""}: ${c.transit.value.types.join(", ")}`
                  : "no"
            }
            source={`${sourceLabel(c.transit)}${
              c.transit.value !== "unknown" && c.transit.value.agencies.length
                ? ` · ${c.transit.value.agencies.join(", ")}`
                : ""
            }`}
          />
          <Fact
            label="Centroid (WGS84)"
            value={c.centroid ? `${c.centroid[1].toFixed(5)}, ${c.centroid[0].toFixed(5)}` : "unknown"}
            source="Computed from the SCAG polygon. Approximate; not a surveyed point."
          />
          <div className="pt-3">
            <SourceLinks links={c.links} />
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-5">
            <h2 className="text-[14px] font-semibold text-ink">Still unknown: check before you call</h2>
            <ul className="flex flex-col gap-2">
              {c.openChecks.map((o) => (
                <li key={o.label} className="flex flex-col gap-[2px]">
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                    <StatusTag tone="review">Unknown</StatusTag>
                    {o.label}
                  </span>
                  <span className="text-[11px] leading-[1.5] text-ink-soft">{o.why}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-5">
            <h2 className="text-[14px] font-semibold text-ink">Pathway leads (not confirmed)</h2>
            <p className="text-[11px] leading-[1.5] text-muted">
              A housing element site is not itself a state-law pathway. These are leads to check.
            </p>
            <ul className="flex flex-col gap-3">
              {c.pathwayLeads.map((p) => (
                <li key={p.law} className="flex flex-col gap-1">
                  <StatusTag>{laws[p.law].name}</StatusTag>
                  <span className="text-[11px] leading-[1.5] text-ink-soft">{p.condition}</span>
                  <span className="flex flex-wrap gap-3">
                    {p.sources.map((s) => (
                      <a
                        key={s}
                        href={s}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-accent hover:underline"
                      >
                        Official source ↗ <span className="text-muted">(checked 2026-11-06)</span>
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-5">
            <h2 className="text-[14px] font-semibold text-ink">How this site was scored</h2>
            <ul className="flex flex-col gap-1">
              {c.scoreParts.map((p) => (
                <li key={p.label} className="text-[11px] leading-[1.5] text-ink-soft">
                  <span className="font-semibold text-ink">
                    {p.label}: {p.points}/{p.max}
                  </span>{" "}
                  · {p.why}
                </li>
              ))}
            </ul>
            <p className="text-[10px] leading-[1.5] text-review">
              ASSUMPTION: the weights are a team choice for ranking, not a measure of feasibility.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
