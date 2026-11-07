import type { Metadata } from "next";
import Link from "next/link";
import { FlagBadge, ListingsPaste } from "@/components/market/listings-paste";
import { PageShell } from "@/components/page-shell";
import { assessParcel } from "@/lib/feasibility/engine";
import { getSource } from "@/lib/feasibility/sources";
import { computeOnMarketFlag } from "@/lib/market/flag";
import {
  listNotices,
  noticeProvenance,
  noticeToParcelFacts,
  noticeToSignal,
} from "@/lib/market/notices";

export const metadata: Metadata = { title: "On the market" };

export default function MarketPage() {
  const prov = noticeProvenance();
  const notices = listNotices();
  const activeCount = notices.filter((n) => n.status === "Active").length;
  const source = getSource("hcd-surplus-notices");

  const rows = notices.map((n) => {
    const report = assessParcel(noticeToParcelFacts(n));
    const open = report.pathways.filter((p) => p.status === "open");
    const hasPass = (p: (typeof open)[number]) => p.tests.some((t) => t.verdict === "pass");
    return {
      n,
      flag: computeOnMarketFlag([noticeToSignal(n)]),
      withEvidence: open.filter(hasPass).map((p) => p.id),
      noEvidence: open.filter((p) => !hasPass(p)).map((p) => p.id),
      unknown: report.coverage.unknown,
      total: report.coverage.totalTests,
    };
  });

  return (
    <PageShell
      title="On the market"
      description="Land that is, or has been, offered. Public notices are real data; private listings only appear if you paste them."
    >
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">
          {activeCount === 0
            ? `No active Surplus Land Act notice in Orange County in HCD's list (last modified ${prov.resourceLastModified.slice(0, 10)}, fetched ${prov.fetched}).`
            : `${activeCount} active Surplus Land Act notice${activeCount === 1 ? "" : "s"} in Orange County (HCD list last modified ${prov.resourceLastModified.slice(0, 10)}).`}
        </p>
        <p className="mt-1">
          {prov.rowsKept} Orange County notices are cached, all with a due date and coordinates.
          Archived notices show which agencies have offered land and where. No public source
          lists private for-sale listings, so the only way a private listing appears here is the
          paste box below. Absence of a signal means &quot;not known to be listed&quot;, never
          &quot;off market&quot;.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your listings</h2>
        <ListingsPaste />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Public notices in Orange County</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Each row is screened by the feasibility engine using only what the notice says, so
            most tests are unknown. &quot;Not blocked&quot; lists laws with no failing test and at
            least one passing one; laws with nothing resolved yet are shown in grey. Neither is a
            yes. Open the report for the per-test detail and next steps.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Flag</th>
                <th className="py-2 pr-3 font-medium">Agency</th>
                <th className="py-2 pr-3 font-medium">City</th>
                <th className="py-2 pr-3 font-medium">Address (public land)</th>
                <th className="py-2 pr-3 font-medium">Acres</th>
                <th className="py-2 pr-3 font-medium">Zoning text</th>
                <th className="py-2 pr-3 font-medium">Existing use</th>
                <th className="py-2 pr-3 font-medium">Issued</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium">Not blocked</th>
                <th className="py-2 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ n, flag, withEvidence, noEvidence, unknown, total }) => (
                <tr key={n.id} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-3">
                    <FlagBadge flag={flag} />
                  </td>
                  <td className="py-2 pr-3">
                    <p>{n.agency || "—"}</p>
                    <p className="text-xs text-neutral-500">{n.agencyType}</p>
                  </td>
                  <td className="py-2 pr-3">{n.city || "—"}</td>
                  <td className="py-2 pr-3">
                    <p>{n.address || "—"}</p>
                    <p className="text-xs text-neutral-500">APN {n.apnRaw || "—"}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {n.sizeAcres !== null ? n.sizeAcres : "—"}
                    {n.sizeRaw && n.sizeAcres === null ? (
                      <span className="block text-xs text-neutral-500">{n.sizeRaw}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{n.generalPlanZoning || "—"}</td>
                  <td className="py-2 pr-3">{n.existingUse || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{n.dateIssued ?? n.dateIssuedRaw ?? "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{n.dueDate ?? n.dueDateRaw ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <p>{withEvidence.length ? withEvidence.join(", ") : "none with a passing test"}</p>
                    {noEvidence.length ? (
                      <p className="text-xs text-neutral-500">
                        {noEvidence.join(", ")}: nothing resolved yet
                      </p>
                    ) : null}
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
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-lg font-semibold">Where this data comes from</h2>
        <div className="rounded-md border border-neutral-200 p-4">
          <p>
            <a href={prov.datasetUrl} target="_blank" rel="noreferrer" className="underline">
              {prov.dataset}
            </a>{" "}
            <span className="rounded bg-neutral-100 px-1 text-xs text-neutral-700">
              {source.status}
            </span>{" "}
            <span className="text-xs text-neutral-500">
              checked {source.checked}; resource last modified {prov.resourceLastModified}; fetched{" "}
              {prov.fetched}
            </span>
          </p>
          <p className="mt-1 text-neutral-700">License: {prov.license}.</p>
          <p className="mt-1 text-neutral-700">
            {prov.rowsKept} of {prov.totalRowsStatewide} statewide rows kept. {prov.filter}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Columns dropped
          </p>
          <ul className="list-disc pl-5 text-neutral-700">
            {prov.columnsDropped.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Derived fields
          </p>
          <ul className="list-disc pl-5 text-neutral-700">
            {prov.derivedFields.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">
            Zoning categories on this page come from a keyword reading of the notice text
            (ASSUMPTION). The notice text is shown as written.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
