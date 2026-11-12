import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { CHAPTER8_LIST_MAX_AGE_DAYS } from "@/lib/chapter8";
import { SOURCES } from "@/lib/feasibility/sources";
import type { Source } from "@/lib/feasibility/types";
import { FOCUS_LABEL } from "@/lib/focus";

export const metadata: Metadata = { title: "About" };

const KIND_LABELS: Record<Source["kind"], string> = {
  statute: "Statute text",
  "fact-sheet": "HCD fact sheets and guidance",
  "bill-page": "Bill pages",
  "data-layer": "Data layers and county pages",
  "repo-doc": "Documents in this repo",
  "user-data": "Data the user brings in",
};

const KIND_ORDER: Source["kind"][] = [
  "data-layer",
  "fact-sheet",
  "statute",
  "bill-page",
  "repo-doc",
  "user-data",
];

const ASSUMPTIONS = [
  "The 100-point score is the team's ranking convention: five metrics of 20 (acquisition certainty, buildability, housing yield, funding competitiveness, cost and complexity), fixed point values per line, unknown data at half points marked to verify, tiers at 75 and 55. No statute or program gives these numbers.",
  `A county tax-defaulted list older than ${CHAPTER8_LIST_MAX_AGE_DAYS} days counts as stale, because owners can redeem until 5 PM the day before an auction (OC Treasurer-Tax Collector). No statute gives this number.`,
  "Zoning categories are a keyword reading of each source's zoning text. The source text is always shown beside the category.",
  "Next steps in a feasibility report are ranked by how many unknowns they clear, not by cost or time.",
  "The aerial image chip is about 150 m across, a size chosen to show a lot and its neighbours. The request limit on the Claude-backed APIs (10 per minute per client) is a demo default.",
  "The three synthetic parcels and the sample paste list on the update page are fictional. Every value in them is made up.",
  "Addresses are withheld for any tax-defaulted or surplus parcel whose use reads as a home. The rule is a heuristic in code.",
];

const PARTS: [string, string][] = [
  ["Search (/)", "Working on three real public lists cached in the repo: 108 tax-defaulted parcels, 231 Surplus Land Act notices and 2,126 housing-element sites, on a street map with a USGS aerial layer. Free text plus source, city, pathway and aerial-label filters."],
  ["Map coordinates", "86 of the 108 tax-defaulted parcels were found in the OC Parcels layer by parcel number; 22 were not found and have no coordinates. Five notices have none either."],
  ["AI aerial read", "AI reading of a USGS image of unknown capture date, committed for 312 located tax-defaulted and surplus sites (not for housing-element sites). Not an inspection. On some tax-defaulted parcels it disagrees with the county's vacant or improved flag; both are shown and neither is treated as right."],
  ["SB 4 (faith or higher-education land)", "Unknown for every site: no loaded dataset has ownership, and an aerial image cannot show it."],
  ["Chapter 8 scout (/chapter8)", "Real: all 108 parcels across Orange County from the county's June 25, 2025 Exhibit I (44 vacant, 64 with a building), filterable by city. The list is from the June 2025 auction, so as of 2026-11-12 parcels may have sold or been redeemed."],
  ["Score out of 100", "Working. Known inputs today: vacant vs built (county list) and housing-element membership (SCAG layer by APN). Every other line scores half points and is marked to verify until its layer is joined."],
  ["Deadline badge", "Working. The loaded list's auction has passed, so it reads as passed; a newer pasted list with a future auction date shows red, orange or green."],
  ["Update list (/market)", "Working on whatever county list you paste; synthetic sample for the demo."],
  ["Feasibility report law tests", "Working; most hazard and local-code tests return unknown because those layers are not queried per parcel yet."],
  ["Local zoning plain-English translation", "Mocked: the slot exists, no city code text is wired."],
  ["Title and CC&R check", "Checklist and draft request only; no public title data exists, so it never returns pass."],
  ["Housing-element scout (/api/scout)", "Kept as a JSON API over live SCAG, Caltrans and zoning layers; not used by any screen. SCAG has no housing-element sites for Santa Ana."],
  ["Owner identity, assessed values, hazards, transit, prices", "Not yet joined; each scores half points marked to verify."],
];

function StatusBadge({ status }: { status: Source["status"] }) {
  return (
    <span
      className={`rounded px-1 text-xs ${status === "VERIFIED" ? "bg-canvas text-ink-soft" : "bg-review-soft text-review"}`}
    >
      {status}
    </span>
  );
}

export default function AboutPage() {
  const sources = Object.values(SOURCES);
  const verified = sources.filter((s) => s.status === "VERIFIED").length;

  return (
    <PageShell
      title="About"
      description={`What Cucumber does for ${FOCUS_LABEL}, where every fact comes from, and what is assumed.`}
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What it does</h2>
        <p className="text-sm text-ink-soft">
          Cucumber searches three public lists for {FOCUS_LABEL} (the county&apos;s tax-defaulted
          list, Surplus Land Act notices and housing-element sites) on one map. For the county
          list it also flags where each parcel sits in the Chapter 8 agreement-sale process, screens what a lot could become
          under SB 9, SB 684 / SB 1123, AB 2011 and SB 4, and says plainly what is still unknown.
          It is a prototype and not legal advice. It sends nothing; every request is drafted for a
          person to review and send.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">How confidence works</h2>
        <p className="text-sm text-ink-soft">
          Confidence means how much the evidence can be trusted, never how good a site is. For a
          Chapter 8 parcel it is the share of facts the county list answers and how fresh the list
          is. For a feasibility report it is the count of tests resolved from current sources, and
          the report says how many rely on an UNVERIFIED source. A test with no data is unknown,
          never pass.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Assumptions</h2>
        <ul className="list-disc pl-5 text-sm text-ink-soft">
          {ASSUMPTIONS.map((a) => (
            <li key={a}>
              <span className="font-medium text-ink">ASSUMPTION:</span> {a}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What is real and what is mocked</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-medium">Part</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PARTS.map(([part, status]) => (
                <tr key={part} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-medium">{part}</td>
                  <td className="py-2 text-ink-soft">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sources</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {sources.length} sources are registered; {verified} are VERIFIED (fetched and matched
            the claim) and the rest are UNVERIFIED leads. Dates are when each was checked.
          </p>
        </div>
        {KIND_ORDER.map((kind) => {
          const group = sources.filter((s) => s.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className="flex flex-col gap-1">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                {KIND_LABELS[kind]}
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {group.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                        {s.name}
                      </a>
                    ) : (
                      <span>{s.name}</span>
                    )}
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-muted">
                      {s.checked ? `checked ${s.checked}` : "not fetched"}
                    </span>
                    {s.note ? (
                      <span className="block w-full text-xs text-muted">{s.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <p className="text-xs text-muted">
          The cached data files carry their provenance in{" "}
          <Link href="/market" className="underline">
            the pipeline
          </Link>{" "}
          and{" "}
          <Link href="/chapter8" className="underline">
            the Chapter 8 pages
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}
