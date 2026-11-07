import type { Metadata } from "next";
import Link from "next/link";
import { Chapter8Checklist } from "@/components/chapter8-checklist";
import { Eyebrow } from "@/components/ui";
import { listCandidates, type Candidate } from "@/lib/chapter8/candidates";
import { listSource, money, parcels, typeLabel } from "@/lib/chapter8/county-list";
import { housingElementLayerInfo } from "@/lib/chapter8/he-join";
import { TIER_LABELS, type DeadlineTone, type Tier } from "@/lib/chapter8/score";
import { FOCUS_CITIES, FOCUS_LABEL, isFocusCity } from "@/lib/focus";

export const metadata: Metadata = { title: "Chapter 8 scout" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const TIERS: Tier[] = ["call-this-week", "worth-a-look", "watch-only"];

const TIER_STYLES: Record<Tier, string> = {
  "call-this-week": "border-feasible bg-feasible-soft text-feasible",
  "worth-a-look": "border-review bg-review-soft text-review",
  "watch-only": "border-line bg-canvas text-ink-soft",
};

const DEADLINE_STYLES: Record<DeadlineTone, string> = {
  red: "text-blocked",
  orange: "text-review",
  green: "text-feasible",
  passed: "text-muted",
  none: "text-muted",
};

function href(city: string | null, tier: Tier | null) {
  const q = new URLSearchParams();
  if (city) q.set("city", city);
  if (tier) q.set("tier", tier);
  const s = q.toString();
  return s ? `/chapter8?${s}` : "/chapter8";
}

function Chip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`rounded-full border px-3 py-1 text-[12px] ${active ? "border-accent bg-accent text-surface" : "border-line bg-surface text-ink-soft hover:border-accent"}`}
    >
      {children}
    </Link>
  );
}

function Row({ c }: { c: Candidate }) {
  const p = c.parcel;
  return (
    <li className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        <div className="flex shrink-0 items-baseline gap-2 md:w-36 md:flex-col md:items-start md:gap-1">
          <span className="font-display text-[32px] leading-none font-semibold text-ink">
            {c.score.total}
            <span className="text-[14px] font-normal text-muted">/100</span>
          </span>
          <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${TIER_STYLES[c.score.tier]}`}>
            {c.score.tierLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] leading-[1.5] text-ink">
          <p>
            <span className="font-semibold">APN {p.apn}</span> · {p.city} ·{" "}
            <span className="text-ink-soft">{typeLabel[p.propertyType]}</span>
          </p>
          <p className="text-ink-soft">
            Minimum bid {money(p.minimumBid)} · tax-defaulted since {p.taxDefaultedOn}
            {c.yearsDelinquent !== null ? ` (about ${c.yearsDelinquent} years)` : ""} · power to sell
            from {p.powerToSellOn}
          </p>
          <p className="text-ink-soft">
            State-law pathways not blocked:{" "}
            {c.lawsWithEvidence.length ? c.lawsWithEvidence.join(", ") : "none with a passing test yet"}
            {c.lawsUnresolved.length ? (
              <span className="text-muted"> · unresolved: {c.lawsUnresolved.join(", ")}</span>
            ) : null}
          </p>
          <p className="text-[12px] text-muted">
            {c.score.verifyCount} score lines still to verify.{" "}
            <Link href={`/chapter8/${p.apn}`} className="text-accent underline">
              Parcel detail
            </Link>{" "}
            ·{" "}
            <Link href={`/report/${c.reportId}`} className="text-accent underline">
              Law tests with sources
            </Link>
          </p>
        </div>

        <div className={`shrink-0 text-[12px] leading-[1.5] md:w-44 md:text-right ${DEADLINE_STYLES[c.deadline.tone]}`}>
          <span aria-hidden>{c.deadline.symbol}</span> {c.deadline.label}
          <span className="block text-[11px] text-muted">Deadline sits beside the score, not in it</span>
        </div>
      </div>

      <details className="mt-3 rounded-[10px] bg-canvas px-4 py-2 text-[12px] leading-[1.5]">
        <summary className="cursor-pointer text-ink-soft">Why this score</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-5">
          {c.score.metrics.map((m) => (
            <div key={m.id} className="flex flex-col gap-1">
              <p className="font-medium text-ink">
                {m.name} <span className="text-muted">{m.points}/{m.max}</span>
              </p>
              <p className="text-muted">{m.question}</p>
              <ul className="flex flex-col gap-0.5">
                {m.lines.map((l) => (
                  <li key={l.label} className={l.verify ? "text-review" : "text-ink-soft"}>
                    {l.reason}
                    {l.verify ? " (to verify)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </li>
  );
}

export default async function Chapter8ScoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const cityParam = first(params.city).trim();
  const city = isFocusCity(cityParam) ? cityParam : null;
  const tierParam = first(params.tier).trim();
  const tier = (TIERS as string[]).includes(tierParam) ? (tierParam as Tier) : null;

  const today = new Date();
  const everything = listCandidates(today);
  const byCity = city ? everything.filter((c) => c.parcel.city.toLowerCase() === city.toLowerCase()) : everything;
  const rows = tier ? byCity.filter((c) => c.score.tier === tier) : byCity;
  const he = housingElementLayerInfo();
  const tierCount = (t: Tier) => byCity.filter((c) => c.score.tier === t).length;
  const cityCount = (name: string) => everything.filter((c) => c.parcel.city.toLowerCase() === name.toLowerCase()).length;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-6 pt-8 pb-12 lg:px-14">
      <div className="flex flex-col gap-3">
        <Eyebrow>Chapter 8 scout · {FOCUS_LABEL}</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.2] font-bold text-ink">
          Tax-defaulted parcels a nonprofit can apply to buy, ranked.
        </h1>
        <p className="max-w-[820px] text-[14px] leading-[1.5] text-ink-soft">
          When property taxes go unpaid long enough, the county can sell the parcel. Under Chapter 8
          of the Revenue and Taxation Code, as this team understands it (statute text UNVERIFIED,
          see About), an eligible nonprofit can apply to buy it by agreement with the county instead
          of bidding at auction. This list is every parcel from the county&apos;s published list in{" "}
          {FOCUS_LABEL}, scored out of 100 on five metrics of 20: acquisition certainty,
          buildability, housing yield, funding competitiveness, and cost and complexity. Unknown
          facts score half points and are marked to verify. The Chapter 8 deadline is shown beside
          the score, never inside it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted">City</span>
          <Chip active={!city} to={href(null, tier)}>
            All three ({everything.length})
          </Chip>
          {FOCUS_CITIES.map((name) => (
            <Chip key={name} active={city?.toLowerCase() === name.toLowerCase()} to={href(name, tier)}>
              {name} ({cityCount(name)})
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted">Tier</span>
          <Chip active={!tier} to={href(city, null)}>
            Any ({byCity.length})
          </Chip>
          {TIERS.map((t) => (
            <Chip key={t} active={tier === t} to={href(city, t)}>
              {TIER_LABELS[t]} ({tierCount(t)})
            </Chip>
          ))}
        </div>
      </div>

      <p className="rounded-[12px] bg-canvas px-4 py-3 text-[12px] leading-[1.5] text-ink-soft">
        {rows.length} of {everything.length} parcels in the three cities; {parcels.length} on the
        county list countywide. Real data from the{" "}
        <a href={listSource.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          County of Orange Treasurer-Tax Collector, Exhibit I for Sale #1398
        </a>
        , fetched {listSource.fetchedOn}, published for the {listSource.auctionDate} auction, so any
        parcel may since have sold or been redeemed. Housing-element membership comes from the cached
        SCAG layer ({he.count} Orange County sites, checked {he.checked ?? "unknown"}). Street
        addresses are left out; the parcel number is what the tax collector needs. Tiers: 75 and up
        call this week, 55 to 74 worth a look, under 55 watch only.
      </p>

      {rows.length ? (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => (
            <Row key={c.parcel.apn} c={c} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No parcels match these filters.</p>
      )}

      <p className="text-[11px] leading-[1.5] text-ink-soft">
        Minimum bids are from the {listSource.auctionDate} public auction; a Chapter 8 price is set
        in the agreement with the county and may differ. Scores rank attention, not value: every
        metric and point value is the team&apos;s convention (ASSUMPTION).
      </p>

      <Chapter8Checklist />
    </div>
  );
}
