"use client";

import { useRouter } from "next/navigation";

export type CityOption = { name: string; count: number };

/**
 * City picker for the Chapter 8 scout: one dropdown for all of Orange County,
 * with the parcel count beside each city. Changing it updates the URL so the
 * server re-renders the filtered list; the tier filter is preserved.
 */
export function CitySelect({
  cities,
  value,
  tier,
  total,
}: {
  cities: CityOption[];
  value: string | null;
  tier: string | null;
  total: number;
}) {
  const router = useRouter();

  const go = (city: string) => {
    const q = new URLSearchParams();
    if (city) q.set("city", city);
    if (tier) q.set("tier", tier);
    const s = q.toString();
    router.push(s ? `/chapter8?${s}` : "/chapter8");
  };

  return (
    <label className="flex flex-col gap-1 text-[12px]">
      <span className="text-[11px] uppercase tracking-wide text-muted">City</span>
      <select
        value={value ?? ""}
        onChange={(e) => go(e.target.value)}
        className="min-w-[280px] rounded-[10px] border border-line-field bg-surface px-3 py-2 text-[13px] text-ink focus:border-accent focus:outline-none"
        aria-label="Filter by city"
      >
        <option value="">All of Orange County ({total})</option>
        {cities.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>
    </label>
  );
}
