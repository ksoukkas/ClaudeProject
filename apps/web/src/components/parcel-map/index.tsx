"use client";

import dynamic from "next/dynamic";

/*
 * MapLibre needs `window` and WebGL, so the map only renders in the browser.
 * The skeleton keeps the same footprint so the layout does not jump.
 */
export const ParcelMap = dynamic(() => import("./parcel-map"), {
  ssr: false,
  loading: () => (
    <div
      aria-busy
      className="flex h-[560px] w-full animate-pulse items-center justify-center rounded-[12px] bg-canvas text-[11px] text-muted lg:h-[740px]"
    >
      Loading map…
    </div>
  ),
});

export type { ParcelMapProps } from "./parcel-map";
