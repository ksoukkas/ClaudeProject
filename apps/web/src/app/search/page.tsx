import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <PageShell
      title="Search"
      description="Describe what you are looking for. Results are a placeholder for now."
    >
      {/* Plain HTML form: submits as a GET to /results with query parameters. */}
      <form action="/results" method="get" className="flex max-w-xl flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">City</span>
          <input
            type="text"
            name="city"
            placeholder="e.g. Anaheim"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Goal</span>
          <input
            type="text"
            name="goal"
            placeholder="e.g. 40+ affordable units near transit"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Search
        </button>
      </form>
    </PageShell>
  );
}
