import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Result" };

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageShell title={`Result ${id}`} description="Detail view for one result.">
      <Placeholder label="detail report for this result." />
      <Link href="/results" className="text-sm text-neutral-700 hover:underline">
        ← Back to results
      </Link>
    </PageShell>
  );
}
