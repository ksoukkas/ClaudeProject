import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell title="Page not found" description="There is nothing at this address.">
      <Link href="/" className="text-sm text-ink-soft hover:underline">
        ← Back home
      </Link>
    </PageShell>
  );
}
