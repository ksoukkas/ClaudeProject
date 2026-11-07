import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Results" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const city = first(params.city).trim();
  const goal = first(params.goal).trim();
  const hasQuery = city.length > 0 || goal.length > 0;

  return (
    <PageShell
      title="Results"
      description={
        hasQuery
          ? `Showing results for ${[city, goal].filter(Boolean).join(" · ")}`
          : "No search yet."
      }
    >
      <Placeholder label="ranked list of results." />
    </PageShell>
  );
}
