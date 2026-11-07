import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { parcelSource } from "@/lib/feasibility";

export const metadata: Metadata = { title: "Feasibility reports" };

export default async function ReportIndexPage() {
  const parcels = await parcelSource.list();

  return (
    <PageShell
      title="Feasibility reports"
      description="One report per parcel: state law tests with sources, local zoning, a title and CC&R checklist, and what would change the answer."
    >
      <p className="text-sm text-neutral-600">
        The parcels below are synthetic test data. Every value is made up (ASSUMPTION). The data
        layer will replace this list with parcels from public services.
      </p>
      <ul className="flex flex-col gap-2">
        {parcels.map((p) => (
          <li key={p.id} className="rounded-md border border-neutral-200 p-3">
            <Link href={`/report/${p.id}`} className="font-medium hover:underline">
              {p.label}
            </Link>
            <span className="ml-2 text-sm text-neutral-600">{p.city}</span>
            {p.synthetic ? (
              <span className="ml-2 rounded bg-amber-50 px-1 text-xs text-amber-800">synthetic</span>
            ) : null}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
