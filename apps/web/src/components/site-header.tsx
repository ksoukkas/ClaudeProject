"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/config";
import { workspace } from "@/lib/sample-data";
import { FigmaIcon } from "@/components/ui";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/results");
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-[10px]">
          <span className="flex h-8 w-[30px] items-center justify-center rounded-[10px] bg-accent">
            <FigmaIcon src="/figma/scout/sprout.svg" size={20} />
          </span>
          <span className="font-display text-[27px] leading-none font-semibold tracking-[-1px] text-ink">
            {site.name.toLowerCase()}
          </span>
          <span className="hidden text-[10px] tracking-[1.1px] text-muted sm:inline">
            ORANGE COUNTY, CA
          </span>
        </Link>

        <nav aria-label="Main" className="h-full min-w-0 overflow-x-auto">
          <ul className="flex h-full gap-[34px]">
            {site.nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex h-full flex-col">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-1 items-center gap-[7px] text-[13px] whitespace-nowrap ${
                      active ? "text-accent" : "text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                    {item.href === "/saved" ? (
                      <span className="rounded-[6px] bg-line px-[9px] py-[3px] text-[10px] leading-[1.3] font-semibold text-ink">
                        {workspace.savedCount}
                      </span>
                    ) : null}
                  </Link>
                  <span
                    className={`h-[3px] w-full ${active ? "bg-accent" : "bg-transparent"}`}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-[10px] md:flex">
          <span className="text-[12px] leading-[1.5] text-muted">
            {workspace.organization}
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-line text-[11px] text-ink">
            {workspace.initials}
          </span>
        </div>
      </div>
    </header>
  );
}
