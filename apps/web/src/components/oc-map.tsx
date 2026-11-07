import Link from "next/link";
import type { Feasibility } from "@/lib/sample-data";
import { FigmaIcon } from "@/components/ui";

/*
 * Illustrative Orange County map from the Figma file. The base is a static
 * SVG; pins and labels sit on top at the design's coordinates, converted to
 * percentages so the map can scale. Geography is not to scale and the pins
 * are fictional.
 */

type Point = [left: number, top: number];

type Layout = {
  width: number;
  height: number;
  base: string;
  north: string;
  pins: Record<number, Point>;
  shields: { label: string; at: Point }[];
  cities: { label: string; at: Point }[];
  streets: { label: string; at: Point }[];
};

const layouts: Record<"scout" | "results", Layout> = {
  scout: {
    width: 440,
    height: 286,
    base: "/figma/scout/mapBase.svg",
    north: "/figma/scout/navigation2.svg",
    pins: {
      1: [174.2, 119.42],
      2: [323.8, 225.24],
      3: [64.2, 96.54],
      4: [121.4, 196.64],
      5: [271, 47.92],
    },
    shields: [
      { label: "57", at: [308, 22.88] },
      { label: "5", at: [268.4, 177.32] },
      { label: "91", at: [162.8, 60.06] },
    ],
    cities: [
      { label: "SANTA ANA", at: [286.2, 223.08] },
      { label: "GARDEN GROVE", at: [66.2, 188.76] },
      { label: "ANAHEIM", at: [167.4, 114.4] },
      { label: "FULLERTON", at: [224.6, 37.18] },
      { label: "BUENA PARK", at: [17.8, 88.66] },
    ],
    streets: [],
  },
  results: {
    width: 612,
    height: 740,
    base: "/figma/results/mapBase.svg",
    north: "/figma/results/navigation2.svg",
    pins: {
      1: [248.16, 332.8],
      2: [456.24, 606.6],
      3: [95.16, 273.6],
      4: [174.72, 532.6],
      5: [382.8, 147.8],
    },
    shields: [
      { label: "57", at: [428.4, 59.2] },
      { label: "5", at: [373.32, 458.8] },
      { label: "91", at: [226.44, 155.4] },
    ],
    cities: [
      { label: "SANTA ANA", at: [411.76, 577.2] },
      { label: "GARDEN GROVE", at: [105.76, 488.4] },
      { label: "ANAHEIM", at: [246.52, 296] },
      { label: "FULLERTON", at: [326.08, 96.2] },
      { label: "BUENA PARK", at: [38.44, 229.4] },
    ],
    streets: [
      { label: "BRISTOL ST", at: [416.16, 688.2] },
      { label: "LA PALMA AVE", at: [306, 236.8] },
      { label: "KATELLA AVE", at: [36.72, 399.6] },
    ],
  },
};

/* The Scout map uses the design's earthier pin palette. */
const scoutPin: Record<Feasibility, string> = {
  feasible: "bg-[#406b54]",
  review: "bg-[#8c671e]",
  blocked: "bg-[#99554b]",
};
const resultsPin: Record<Feasibility, string> = {
  feasible: "bg-feasible",
  review: "bg-review",
  blocked: "bg-blocked",
};

export type MapPin = {
  rank: number;
  feasibility: Feasibility;
  href?: string;
  label?: string;
  dimmed?: boolean;
};

export function OcMap({
  variant,
  pins,
  className = "",
}: {
  variant: "scout" | "results";
  pins: MapPin[];
  className?: string;
}) {
  const layout = layouts[variant];
  const pos = ([left, top]: Point) => ({
    left: `${(left / layout.width) * 100}%`,
    top: `${(top / layout.height) * 100}%`,
  });
  const pinColor = variant === "scout" ? scoutPin : resultsPin;

  return (
    <div
      className={`relative w-full overflow-hidden bg-canvas ${className}`}
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static map art */}
      <img
        src={layout.base}
        alt=""
        aria-hidden
        className="absolute inset-0 block size-full"
      />

      {layout.cities.map((c) => (
        <span
          key={c.label}
          className="absolute text-[10px] tracking-[1.1px] whitespace-nowrap text-muted"
          style={pos(c.at)}
        >
          {c.label}
        </span>
      ))}
      {layout.streets.map((s) => (
        <span
          key={s.label}
          className="absolute text-[8px] tracking-[1.1px] whitespace-nowrap text-muted"
          style={pos(s.at)}
        >
          {s.label}
        </span>
      ))}
      {layout.shields.map((s) => (
        <span
          key={s.label}
          className="absolute flex h-[19px] w-6 items-center justify-center rounded-[4px] border border-[#b8b8b8] bg-white text-[10px] text-ink-soft"
          style={pos(s.at)}
        >
          {s.label}
        </span>
      ))}

      {pins.map((pin) => {
        const at = layout.pins[pin.rank];
        if (!at) return null;
        const classes = `absolute flex size-[30px] items-center justify-center rounded-full border-3 border-white text-[11px] font-bold text-white shadow-sm transition-transform ${
          pinColor[pin.feasibility]
        } ${pin.dimmed ? "opacity-30" : ""}`;
        return pin.href ? (
          <Link
            key={pin.rank}
            href={pin.href}
            aria-label={pin.label}
            className={`${classes} hover:scale-110`}
            style={pos(at)}
          >
            {pin.rank}
          </Link>
        ) : (
          <span key={pin.rank} className={classes} style={pos(at)}>
            {pin.rank}
          </span>
        );
      })}

      <span className="absolute top-4 right-4 flex h-[46px] w-[30px] flex-col items-center justify-center gap-[2px] rounded-[6px] bg-white text-[9px] font-semibold text-ink">
        N
        <FigmaIcon src={layout.north} size={14} />
      </span>

      {variant === "results" ? (
        <span className="absolute right-4 bottom-14 flex flex-col gap-px overflow-hidden rounded-[6px] bg-white">
          <span className="flex size-8 items-center justify-center">
            <FigmaIcon src="/figma/results/plus.svg" size={16} />
          </span>
          <span className="flex size-8 items-center justify-center">
            <FigmaIcon src="/figma/results/minus.svg" size={16} />
          </span>
        </span>
      ) : null}

      <span className="absolute bottom-[10px] left-3 rounded-[3px] bg-white/85 px-[7px] py-1 text-[8px] text-muted">
        Illustrative geography · fictional pins · not to scale
      </span>
    </div>
  );
}
