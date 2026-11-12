"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/config";
import { FOCUS_LABEL } from "@/lib/focus";
import { CucumberLogo } from "@/components/cucumber-logo";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/chapter8") return pathname.startsWith("/chapter8") || pathname.startsWith("/report");
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-12">
        <Link href="/" aria-label={`${site.name} home`} className="flex shrink-0 items-center gap-[10px]">
          <CucumberLogo wordmarkSize={26} />
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
            Chapter 8 focus: {FOCUS_LABEL}
          </span>
        </div>
      </div>
    </header>
  );
}
