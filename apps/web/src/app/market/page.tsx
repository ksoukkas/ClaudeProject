import type { Metadata } from "next";
import Link from "next/link";
import { Chapter8Pipeline } from "@/components/chapter8/chapter8-pipeline";
import { FlagBadge } from "@/components/market/listings-paste";
import { PageShell } from "@/components/page-shell";
import { assessParcel } from "@/lib/feasibility/engine";
import { getSource } from "@/lib/feasibility/sources";
import { FOCUS_LABEL } from "@/lib/focus";
import { computeOnMarketFlag } from "@/lib/market/flag";
import {
  listNotices,
  noticeProvenance,
  noticeToParcelFacts,
  noticeToSignal,
  totalCachedNotices,
} from "@/lib/market/notices";

export const metadata: Metadata = { title: "Chapter 8 pipeline" };

function SourceRow({ id }: { id: string }) {
  const s = getSource(id);
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      {s.url ? (
        <a href={s.url} target="_blank" rel="noreferrer" className="underline">
          {s.name}
        </a>
      ) : (
        <span>{s.name}</span>
      )}
      <span
        className={`rounded px-1 text-xs ${s.status === "VERIFIED" ? "bg-neutral-100 text-neutral-700" : "bg-amber-50 text-amber-800"}`}
      >
        {s.status}
      </span>
      <span className="text-xs text-neutral-500">
        {s.checked ? `checked ${s.checked}` : "not fetched"}
      </span>
      {s.note ? <span className="block w-full text-xs text-neutral-600">{s.note}</span> : null}
    </li>
  );
}

export default function MarketPage() {
  const prov = noticeProvenance();
  const notices = listNotices();
  const activeNotices = listNotices({ activeOnly: true }).length;
  const noticeRows = notices.map((n) => {
    const report = assessParcel(noticeToParcelFacts(n));
    const open = report.pathways.filter((p) => p.status === "open");
    const hasPass = (p: (typeof open)[number]) => p.tests.some((t) => t.verdict === "pass");
    return {
      n,
      flag: computeOnMarketFlag([noticeToSignal(n)]),
      withEvidence: open.filter(hasPass).map((p) => p.id),
      unknown: report.coverage.unknown,
      total: report.coverage.totalTests,
    };
  });

  return (
    <PageShell
      title="Chapter 8 pipeline"
      description={`Tax-defaulted parcels in ${FOCUS_LABEL} that a nonprofit may be able to acquire by agreement before the county's tax auction.`}
    >
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p className="font-semibold">What Chapter 8 is</p>
        <p className="mt-1 text-neutral-700">
          When property taxes go unpaid long enough, the county tax collector gains the power to
          sell the parcel and offers it at public auction. California&apos;s tax-sale law also
          lets the county sell tax-defaulted property by agreement to a public agency or a
          nonprofit instead, and a nonprofit may ask that a parcel be withheld from the auction
          for low-income housing. That is a legal path to land before the open market. The statute
          sections are cited below with their verification status: they were not readable in
          automated fetches today, so read them in a browser before acting.
        </p>
        <p className="mt-2 text-neutral-700">
          What the county itself says (read 2026-11-07): the most recent Orange County tax
          auction was June 25, 2025, approved by the Board of Supervisors on March 11, 2025; an
          owner can redeem until 5 PM the day before an auction; the parcel list can be viewed by
          anyone and downloaded as a spreadsheet by registered users; a GIS map shows every
          auction parcel.
        </p>
        <ul className="mt-3 flex flex-col gap-1">
          {["octtc-tax-auction", "octtc-published-notices", "rtc-3692-4", "rtc-3791-4", "rtc-chapter-8"].map(
            (id) => (
              <SourceRow key={id} id={id} />
            ),
          )}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          A prototype, not legal advice. Siteline sends nothing; the request to the tax collector
          is yours to make.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">The county list</h2>
        <Chapter8Pipeline />
      </section>

      <details className="rounded-md border border-neutral-200 p-4">
        <summary className="cursor-pointer text-base font-semibold">
          Other public land: Surplus Land Act notices in {FOCUS_LABEL} ({notices.length})
        </summary>
        <p className="mt-2 text-sm text-neutral-600">
          Real HCD data kept as a second public-land channel.{" "}
          {activeNotices === 0
            ? "No active notice in these cities"
            : `${activeNotices} active notice${activeNotices === 1 ? "" : "s"} in these cities`}{" "}
          in HCD&apos;s list (last modified {prov.resourceLastModified.slice(0, 10)}, fetched{" "}
          {prov.fetched}); {notices.length} of {totalCachedNotices()} cached Orange County rows are
          shown. {prov.privacy}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Flag</th>
                <th className="py-2 pr-3 font-medium">Agency</th>
                <th className="py-2 pr-3 font-medium">City</th>
                <th className="py-2 pr-3 font-medium">Address (public land)</th>
                <th className="py-2 pr-3 font-medium">Acres</th>
                <th className="py-2 pr-3 font-medium">Zoning text</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium">Not blocked</th>
                <th className="py-2 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {noticeRows.map(({ n, flag, withEvidence, unknown, total }) => (
                <tr key={n.id} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-3">
                    <FlagBadge flag={flag} />
                  </td>
                  <td className="py-2 pr-3">{n.agency || "—"}</td>
                  <td className="py-2 pr-3">{n.city || "—"}</td>
                  <td className="py-2 pr-3">
                    {n.addressWithheld ? (
                      <span className="text-neutral-500">{n.addressWithheld}</span>
                    ) : (
                      n.address || "—"
                    )}
                    <span className="block text-xs text-neutral-500">APN {n.apnRaw || "—"}</span>
                  </td>
                  <td className="py-2 pr-3">{n.sizeAcres ?? "—"}</td>
                  <td className="py-2 pr-3">{n.generalPlanZoning || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{n.dueDate ?? n.dueDateRaw ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <p>{withEvidence.length ? withEvidence.join(", ") : "none with a passing test"}</p>
                    <p className="text-xs text-neutral-500">
                      {unknown} of {total} unknown
                    </p>
                  </td>
                  <td className="py-2">
                    <Link href={`/report/${n.id}`} className="underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Source:{" "}
          <a href={prov.datasetUrl} target="_blank" rel="noreferrer" className="underline">
            {prov.dataset}
          </a>
          , {prov.license}. Built by apps/web/scripts/build-surplus-notices-oc.mjs.
        </p>
      </details>
    </PageShell>
  );
}
