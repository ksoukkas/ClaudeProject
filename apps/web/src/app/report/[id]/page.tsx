import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeasibilityReportView } from "@/components/feasibility/feasibility-report";
import { assessParcel, parcelSource } from "@/lib/feasibility";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const facts = await parcelSource.get(id);
  return { title: facts ? `Report: ${facts.label}` : "Report" };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const facts = await parcelSource.get(id);
  if (!facts) notFound();

  const report = assessParcel(facts);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/report" className="text-sm text-neutral-700 hover:underline">
        ← All reports
      </Link>
      <FeasibilityReportView report={report} />
    </div>
  );
}
