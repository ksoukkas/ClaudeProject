import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { parcelSource } from "@/lib/feasibility";
import { FOCUS_LABEL } from "@/lib/focus";

export const metadata: Metadata = { title: "Feasibility reports" };

export default async function ReportIndexPage() {
  const parcels = await parcelSource.list();
  const county = parcels.filter((p) => !p.synthetic);
  const synthetic = parcels.filter((p) => p.synthetic);

  return (
    <PageShell
      title="Feasibility reports"
      description={`What each Chapter 8 parcel in ${FOCUS_LABEL} could become: one row per state-law test with its source, a title and CC&R checklist, and what would change the answer.`}
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Chapter 8 parcels</h2>
        <p className="text-sm text-ink-soft">
          {county.length} tax-defaulted parcels from the county list, screened with only what the
          list says. Most tests are unknown until the parcel layer is joined; each report says what
          would resolve them. Scores and ranking are on the{" "}
          <Link href="/chapter8" className="underline">
            Chapter 8 scout
          </Link>
          .
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {county.map((p) => (
            <li key={p.id}>
              <Link href={`/report/${p.id}`} className="hover:underline">
                {p.label}
              </Link>
              <span className="ml-2 text-ink-soft">{p.city}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Synthetic test parcels</h2>
        <p className="text-sm text-ink-soft">
          Made up to show each verdict path. Every value is an ASSUMPTION.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {synthetic.map((p) => (
            <li key={p.id}>
              <Link href={`/report/${p.id}`} className="hover:underline">
                {p.label}
              </Link>
              <span className="ml-2 rounded bg-review-soft px-1 text-xs text-review">synthetic</span>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
