import { FigmaIcon } from "@/components/ui";

/*
 * Close-up block map from the parcel report design (340 × 286). Built from
 * plain shapes in Figma, so it is rebuilt here the same way. Illustrative only:
 * not a survey and not real parcel geometry.
 */
const W = 340;
const H = 286;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

const lotColumns = [20, 80, 140, 200, 260];
const lotRows = [22, 100.67, 179.33];
const horizontalRoads = Array.from({ length: 11 }, (_, i) => ({
  top: 23.83 * (i + 1),
  wide: i % 3 === 0,
}));
const verticalRoads = Array.from({ length: 9 }, (_, i) => ({
  left: 34 * (i + 1),
  wide: i % 3 === 0,
}));
const openSpace = [
  [272, 14.3, 51, 37.18],
  [159.8, 185.9, 47.6, 34.32],
  [27.2, 228.8, 64.6, 42.9],
  [251.6, 85.8, 40.8, 42.9],
  [13.6, 20.02, 61.2, 34.32],
] as const;

export function ParcelContextMap({ acresLabel }: { acresLabel: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px] border border-line bg-canvas lg:w-[340px] lg:shrink-0"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      {lotRows.flatMap((top) =>
        lotColumns.map((left) => (
          <span
            key={`${left}-${top}`}
            className="absolute border border-[#c8cebd] bg-[#e0e2d5]"
            style={{ left: pct(left, W), top: pct(top, H), width: pct(55, W), height: pct(67, H) }}
          />
        )),
      )}
      {horizontalRoads.map((r) => (
        <span
          key={`h${r.top}`}
          className="absolute left-0 w-full bg-[#fffef7]"
          style={{ top: pct(r.top, H), height: r.wide ? 5 : 2 }}
        />
      ))}
      {verticalRoads.map((r) => (
        <span
          key={`v${r.left}`}
          className="absolute top-0 h-full bg-[#fffef7]"
          style={{ left: pct(r.left, W), width: r.wide ? 5 : 2 }}
        />
      ))}
      {openSpace.map(([left, top, w, h]) => (
        <span
          key={`${left}-${top}`}
          className="absolute rounded-[8px] bg-[#d6dfc9]"
          style={{ left: pct(left, W), top: pct(top, H), width: pct(w, W), height: pct(h, H) }}
        />
      ))}

      {/* Selected parcel with a sample building footprint and utility easement */}
      <span
        className="absolute overflow-hidden border-2 border-accent bg-accent"
        style={{ left: pct(115.6, W), top: pct(71.5, H), width: pct(108.8, W), height: pct(114.4, H) }}
      >
        <span
          className="absolute bg-[#85967c]"
          style={{ left: "12%", top: "14.5%", width: "59%", height: "35%" }}
        />
        <span
          className="absolute top-0 h-full bg-[#d2b87d]"
          style={{ left: "84%", width: "11%" }}
          title="Sample utility easement"
        />
        <span
          className="absolute text-[11px] font-semibold whitespace-nowrap text-white"
          style={{ left: "18.5%", top: "66%" }}
        >
          {acresLabel}
        </span>
      </span>

      <span
        className="absolute rounded-[6px] border border-line bg-white px-[5px] py-[3px] text-[8px] tracking-[0.6px] whitespace-nowrap text-muted"
        style={{ left: pct(44.2, W), top: pct(217.36, H) }}
      >
        W OLIVE COMMONS · FICTIONAL
      </span>
      <span className="absolute top-4 right-4 flex h-[46px] w-[30px] flex-col items-center justify-center gap-[2px] rounded-[10px] border border-line bg-white text-[9px] font-semibold text-ink">
        N
        <FigmaIcon src="/figma/parcel/navigation2.svg" size={14} />
      </span>
      <span className="absolute bottom-[10px] left-3 rounded-[6px] border border-line bg-white/85 px-[7px] py-1 text-[8px] text-muted">
        Illustrative boundary · not a survey
      </span>
    </div>
  );
}
