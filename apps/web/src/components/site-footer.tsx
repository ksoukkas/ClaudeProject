import { site } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 text-sm text-neutral-600">
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        <p>
          {site.name} is a prototype built at the Claude Impact Lab: UCI × SoCal
          Affordable Housing (November 7, 2026). It is not legal, financial or
          lending advice. Talk to a professional before making decisions.
        </p>
      </div>
    </footer>
  );
}
