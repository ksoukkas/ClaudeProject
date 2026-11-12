import type { AerialLabel, PathwayStatus, SiteSource } from "@/lib/search/types";
import type { Tone } from "@/components/ui";

export const SOURCE_ORDER: SiteSource[] = ["tax-defaulted", "surplus-notice", "housing-element"];

export const SOURCE_LABEL: Record<SiteSource, string> = {
  "tax-defaulted": "Tax-defaulted",
  "surplus-notice": "Surplus land notice",
  "housing-element": "Housing-element site",
};

/** Map and tag colours, kept inside the palette: forest, fresh, soft ink. */
export const SOURCE_COLOR: Record<SiteSource, string> = {
  "tax-defaulted": "#174d38",
  "surplus-notice": "#80ba62",
  "housing-element": "#455e4f",
};

export const STATUS_TONE: Record<PathwayStatus, Tone> = {
  likely: "feasible",
  possible: "review",
  unknown: "line-muted",
  no: "blocked",
};

export const STATUS_LABEL: Record<PathwayStatus, string> = {
  likely: "Likely",
  possible: "Possible",
  unknown: "Unknown",
  no: "No",
};

export const AERIAL_LABEL_TEXT: Record<AerialLabel, string> = {
  "vacant-lot": "Vacant lot",
  "parking-lot": "Parking lot",
  "building-intact": "Building, looks intact",
  "building-possibly-distressed": "Building, possibly distressed",
  unclear: "Unclear",
};

export function isSource(v: string | null | undefined): v is SiteSource {
  return !!v && (SOURCE_ORDER as string[]).includes(v);
}

export function acresText(a: number | null): string {
  if (a == null) return "unknown";
  return `${a < 10 ? a.toFixed(2) : a.toFixed(1)} ac`;
}
