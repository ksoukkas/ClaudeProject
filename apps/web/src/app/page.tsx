import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchApp } from "@/components/search/search-app";

export const metadata: Metadata = {
  title: "Search sites",
  description: "Search Orange County sites for affordable homes: tax-defaulted parcels, surplus land notices and housing-element sites.",
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-64" aria-busy="true" />}>
      <SearchApp />
    </Suspense>
  );
}
