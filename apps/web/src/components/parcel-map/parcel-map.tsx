"use client";

import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { feasibilityLabel } from "@/components/ui";
import type { Feasibility, Parcel } from "@/lib/sample-data";

/*
 * Interactive map for the Results screen (MapLibre GL JS, no wrapper).
 *
 * Tiles: OpenFreeMap "positron" style, no API key. MapLibre's attribution
 * control stays on so the OpenFreeMap / OpenMapTiles / OpenStreetMap credit
 * shows.
 *
 * Two layers, never mixed: the fictional sample sites (numbered pins at
 * ILLUSTRATIVE positions), or the cached public Housing Element sites
 * (public/data/he-sites.geojson). Public points carry no feasibility verdict.
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
// Buena Park in the north-west to Santa Ana in the south-east.
const INITIAL_BOUNDS: [[number, number], [number, number]] = [
  [-118.05, 33.68],
  [-117.82, 33.9],
];
const HE_SOURCE = "he-sites";
const HE_LAYER = "he-sites-points";

// The worker ships as its own module. MapLibre looks for it next to its own
// file, which a bundler moves, so point it at the bundled copy instead.
setWorkerUrl(
  new URL("../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

const pinColor: Record<Feasibility, string> = {
  feasible: "bg-feasible",
  review: "bg-review",
  blocked: "bg-blocked",
};

type Mode = "sample" | "public";

type HeMeta = { checked: string; recordCount: number; sourceUrl: string };

type HeProps = {
  apn: string | null;
  jurisdiction: string | null;
  lowIncomeCapacity: number | null;
  moderateIncomeCapacity: number | null;
  aboveModerateIncomeCapacity: number | null;
  totalCapacity: number | null;
  year: number | null;
};

export type ParcelMapProps = {
  parcels: Parcel[];
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Popup body built with DOM nodes (textContent), so source text is never parsed as HTML. */
function hePopup(p: HeProps, checked: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col gap-1 text-[11px] leading-[1.4] text-ink";
  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = "Housing Element site";
  root.append(title);
  const rows: [string, string | number | null][] = [
    ["APN", p.apn],
    ["Jurisdiction", p.jurisdiction],
    ["Total capacity (units)", p.totalCapacity],
    ["Lower income", p.lowIncomeCapacity],
    ["Moderate income", p.moderateIncomeCapacity],
    ["Above moderate", p.aboveModerateIncomeCapacity],
    ["YEAR (source field)", p.year],
  ];
  for (const [label, value] of rows) {
    if (value === null || value === undefined || value === "") continue;
    const row = document.createElement("p");
    const key = document.createElement("span");
    key.className = "text-muted";
    key.textContent = `${label}: `;
    row.append(key, String(value));
    root.append(row);
  }
  const source = document.createElement("p");
  source.className = "pt-1 text-[10px] text-muted";
  source.textContent = `Source: SCAG Housing Element sites, checked ${checked}. No feasibility or law screen applied.`;
  root.append(source);
  return root;
}

function stylePin(
  el: HTMLButtonElement,
  parcel: Parcel,
  dimmed: boolean,
  selected: boolean,
) {
  el.className = [
    "flex size-[30px] cursor-pointer items-center justify-center rounded-full border-3 border-white text-[11px] font-bold text-white shadow-sm transition-[opacity,box-shadow] outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
    pinColor[parcel.feasibility],
    dimmed ? "opacity-30" : "opacity-100",
    selected ? "ring-4 ring-ink/60" : "",
  ].join(" ");
  el.setAttribute(
    "aria-label",
    `${parcel.rank}. ${parcel.address}, ${parcel.city} (sample site, illustrative location) · ${feasibilityLabel[parcel.feasibility]}${dimmed ? " · hidden by filters" : ""}`,
  );
  el.setAttribute("aria-pressed", selected ? "true" : "false");
}

export default function ParcelMap({ parcels, visibleIds, selectedId, onSelect }: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const onSelectRef = useRef(onSelect);
  const popupRef = useRef<Popup | null>(null);
  const modeRef = useRef<Mode>("sample");
  const [mode, setMode] = useState<Mode>("sample");
  const [heMeta, setHeMeta] = useState<HeMeta | null>(null);
  const [heError, setHeError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Effect 1: create the map once. Strict mode mounts twice, so clean up fully.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container,
      style: STYLE_URL,
      bounds: INITIAL_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      cooperativeGestures: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      // Tile or style failures: say so instead of showing a blank box.
      if (!map.isStyleLoaded()) setMapError(e.error?.message ?? "Map failed to load");
    });
    map.on("load", () => setMapError(null));
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Effect 2: diff the sample-site markers against the current props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const wanted = mode === "sample" ? parcels : [];
    const wantedIds = new Set(wanted.map((p) => p.id));

    for (const [id, marker] of markers) {
      if (!wantedIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    for (const parcel of wanted) {
      let marker = markers.get(parcel.id);
      if (!marker) {
        // MapLibre owns the wrapper's classes and transform; we style the button.
        const wrapper = document.createElement("div");
        const pin = document.createElement("button");
        pin.type = "button";
        pin.textContent = String(parcel.rank);
        pin.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(parcel.id);
        });
        wrapper.append(pin);
        marker = new Marker({ element: wrapper, anchor: "center" })
          .setLngLat([parcel.position.lng, parcel.position.lat])
          .addTo(map);
        markers.set(parcel.id, marker);
      } else {
        marker.setLngLat([parcel.position.lng, parcel.position.lat]);
      }
      const selected = parcel.id === selectedId;
      const wrapper = marker.getElement();
      stylePin(wrapper.firstElementChild as HTMLButtonElement, parcel, !visibleIds.has(parcel.id), selected);
      // Selected pin on top; otherwise keep rank order so 1 sits above 5.
      wrapper.style.zIndex = selected ? "10" : String(6 - Math.min(parcel.rank, 5));
    }
  }, [parcels, visibleIds, selectedId, mode]);

  // Effect 3: bring the selected pin into view (only moves if it is off-screen).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId || mode !== "sample") return;
    const parcel = parcels.find((p) => p.id === selectedId);
    if (!parcel) return;
    const at: [number, number] = [parcel.position.lng, parcel.position.lat];
    const b = map.getBounds();
    const inset = new LngLatBounds(
      [b.getWest() + (b.getEast() - b.getWest()) * 0.08, b.getSouth() + (b.getNorth() - b.getSouth()) * 0.08],
      [b.getEast() - (b.getEast() - b.getWest()) * 0.08, b.getNorth() - (b.getNorth() - b.getSouth()) * 0.08],
    );
    if (!inset.contains(at)) map.easeTo({ center: at, duration: 500 });
  }, [selectedId, parcels, mode]);

  // Effect 4: the public Housing Element layer, added on first use.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    async function ensureLayer(m: MapLibreMap) {
      if (m.getSource(HE_SOURCE)) return;
      try {
        const [meta, data] = await Promise.all([
          fetch("/data/he-sites.meta.json").then((r) => {
            if (!r.ok) throw new Error(`meta ${r.status}`);
            return r.json() as Promise<HeMeta>;
          }),
          fetch("/data/he-sites.geojson").then((r) => {
            if (!r.ok) throw new Error(`data ${r.status}`);
            return r.json();
          }),
        ]);
        if (cancelled || m.getSource(HE_SOURCE)) return;
        setHeMeta(meta);
        m.addSource(HE_SOURCE, { type: "geojson", data });
        m.addLayer({
          id: HE_LAYER,
          type: "circle",
          source: HE_SOURCE,
          layout: { visibility: modeRef.current === "public" ? "visible" : "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 6],
            "circle-color": "#6e6e73",
            "circle-opacity": 0.75,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        m.on("click", HE_LAYER, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          popupRef.current?.remove();
          popupRef.current = new Popup({ closeButton: true, maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setDOMContent(hePopup(f.properties as HeProps, meta.checked))
            .addTo(m);
        });
        m.on("mouseenter", HE_LAYER, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", HE_LAYER, () => (m.getCanvas().style.cursor = ""));
      } catch (err) {
        if (!cancelled) setHeError(err instanceof Error ? err.message : "failed to load");
      }
    }

    function apply() {
      if (!map) return;
      if (mode === "public") {
        void ensureLayer(map);
      }
      if (map.getLayer(HE_LAYER)) {
        map.setLayoutProperty(HE_LAYER, "visibility", mode === "public" ? "visible" : "none");
      }
      if (mode !== "public") popupRef.current?.remove();
    }

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);

    return () => {
      cancelled = true;
      map.off("load", apply);
    };
  }, [mode]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[12px] bg-canvas lg:h-[740px]">
      {/* MapLibre's CSS forces `position: relative` on this element, so size it
          with h-full/w-full rather than absolute positioning (which collapses
          it to 0px tall and leaves a blank map). */}
      <div ref={containerRef} className="h-full w-full" />

      <div
        role="radiogroup"
        aria-label="Map layer"
        className="absolute top-3 left-3 z-10 flex overflow-hidden rounded-[10px] border border-line bg-surface text-[11px] font-medium shadow-sm"
      >
        {(
          [
            ["sample", "Sample sites"],
            ["public", "Public data: Housing Element sites"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`px-3 py-[7px] ${
              mode === value ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="absolute bottom-[34px] left-3 z-10 max-w-[calc(100%-24px)] rounded-[6px] bg-white/90 px-[9px] py-[5px] text-[10px] leading-[1.4] text-ink-soft shadow-sm">
        {mode === "sample" ? (
          <>Sample sites · illustrative locations, not real parcels</>
        ) : heError ? (
          <>Public layer unavailable ({heError})</>
        ) : heMeta ? (
          <>
            Public data · {heMeta.recordCount} SCAG Housing Element sites (Anaheim; none for
            Santa Ana in this layer) · checked {heMeta.checked} · no feasibility screen
          </>
        ) : (
          <>Loading public Housing Element sites…</>
        )}
      </span>

      {mapError ? (
        <p className="absolute inset-x-3 top-14 z-10 rounded-[8px] bg-white/95 p-3 text-[11px] text-ink-soft">
          Base map tiles did not load ({mapError}). Pins still show the sample sites; check the
          network connection.
        </p>
      ) : null}
    </div>
  );
}
