import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { parcelSource } from "@/lib/feasibility";

export const metadata: Metadata = { title: "Feasibility reports" };

export default async function ReportIndexPage() {
  const parcels = await parcelSource.list();
  const synthetic = parcels.filter((p) => p.synthetic);
  const real = parcels.filter((p) => !p.synthetic);

  return (
    <PageShell
      title="Feasibility reports"
      description="One report per parcel: state law tests with sources, local zoning, a title and CC&R checklist, and what would change the answer."
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Synthetic test parcels</h2>
        <p className="text-sm text-ink-soft">
          Made up for testing. Every value is an ASSUMPTION. They show each verdict path.
        </p>
        <ul className="flex flex-col gap-2">
          {synthetic.map((p) => (
            <li key={p.id} className="rounded-md border border-line p-3">
              <Link href={`/report/${p.id}`} className="font-medium hover:underline">
                {p.label}
              </Link>
              <span className="ml-2 text-sm text-ink-soft">{p.city}</span>
              <span className="ml-2 rounded bg-review-soft px-1 text-xs text-review">synthetic</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Public land from Surplus Land Act notices</h2>
        <p className="text-sm text-ink-soft">
          {real.length} notices for Santa Ana, Stanton and Anaheim from the HCD list, each screened
          with only what the notice says. Browse them with flags and dates on the{" "}
          <Link href="/market" className="underline">
            On the market
          </Link>{" "}
          page.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {real.slice(0, 25).map((p) => (
            <li key={p.id}>
              <Link href={`/report/${p.id}`} className="hover:underline">
                {p.label}
              </Link>
              <span className="ml-2 text-ink-soft">{p.city}</span>
            </li>
          ))}
        </ul>
        {real.length > 25 ? (
          <p className="text-xs text-muted">
            Showing 25 of {real.length}. The full list is on the On the market page.
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
