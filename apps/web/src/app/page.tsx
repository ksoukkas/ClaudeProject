import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Placeholder } from "@/components/placeholder";
import { site } from "@/lib/config";

export default function HomePage() {
  return (
    <PageShell title={site.name} description={site.tagline}>
      <div className="flex gap-3">
        <Link
          href="/search"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Start a search
        </Link>
        <Link
          href="/about"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          About
        </Link>
      </div>
      <Placeholder label="landing page content." />
    </PageShell>
  );
}
