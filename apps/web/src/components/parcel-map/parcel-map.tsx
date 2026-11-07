"use client";

import {
  type GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  type MapLayerMouseEvent,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { feasibilityLabel } from "@/components/ui";
import {
  type Bounds,
  type GoalLabel,
  type PublicSite,
  goalLabel,
  publicMeta,
  toFeatureCollection,
} from "@/lib/public-sites";
import type { Feasibility, Parcel } from "@/lib/sample-data";

/*
 * Interactive map for the Results screen (MapLibre GL JS, no wrapper).
 *
 * Tiles: OpenFreeMap "positron" style, no API key. MapLibre's attribution
 * control stays on so the OpenFreeMap / OpenMapTiles / OpenStreetMap credit
 * shows.
 *
 * Two layers, each with its own toggle and its own look, so they are never
 * confused: the fictional sample sites (numbered, colored pins at
 * ILLUSTRATIVE positions) and the real public Housing Element sites
 * (clustered grey dots, no feasibility verdict).
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
// Buena Park in the north-west to Santa Ana in the south-east.
const INITIAL_BOUNDS: [[number, number], [number, number]] = [
  [-118.05, 33.68],
  [-117.82, 33.9],
];
const HE_SOURCE = "he-sites";
const HE_CLUSTERS = "he-clusters";
const HE_CLUSTER_COUNT = "he-cluster-count";
const HE_POINTS = "he-points";
const HE_SELECTED = "he-selected";
const HE_LAYERS = [HE_CLUSTERS, HE_CLUSTER_COUNT, HE_POINTS, HE_SELECTED];

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

/* Public sites: planned homes vs the unit goal (see --color-plan-* tokens). */
const planHex: Record<GoalLabel, string> = {
  meets: "#2f7d5b",
  below: "#8e8e93",
  unknown: "#c7c7cc",
};
const planBg: Record<GoalLabel, string> = {
  meets: "bg-plan-meets",
  below: "bg-plan-below",
  unknown: "bg-plan-unknown",
};

export type ParcelMapProps = {
  parcels: Parcel[];
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Public sites that pass the current filters, or null while loading. */
  publicSites: PublicSite[] | null;
  publicError: string | null;
  selectedPublicId: number | null;
  onSelectPublic: (id: number | null) => void;
  showSample: boolean;
  showPublic: boolean;
  onToggleLayer: (layer: "sample" | "public") => void;
  unitGoal: number;
  /** The top public sites, numbered on the map in the same order as the list. */
  topPublic: PublicSite[];
  /**
   * Optional pin numbers, parallel to `topPublic` (e.g. the live scout's
   * ranks). Defaults to 1, 2, 3... in list order.
   */
  topNumbers?: readonly number[];
  /** Where to frame the map. The map refits whenever `key` changes. */
  focus: { key: string; bounds: Bounds } | null;
};

/** Popup body built with DOM nodes (textContent), so source text is never parsed as HTML. */
function publicPopup(site: PublicSite): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col gap-1 text-[11px] leading-[1.4] text-ink";
  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = `Housing Element site · ${site.city}`;
  root.append(title);
  const rows: [string, string | number | null][] = [
    ["APN", site.apn],
    ["Planned homes (total)", site.totalCapacity],
    ["Lower income", site.lowIncomeCapacity],
    ["Moderate income", site.moderateIncomeCapacity],
    ["Above moderate", site.aboveModerateIncomeCapacity],
    ["YEAR (source field)", site.year],
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
  source.textContent = `Source: SCAG Housing Element sites, checked ${publicMeta.checked}. Planned capacity from the city's housing element, not a feasibility or law screen.`;
  root.append(source);
  return root;
}

function stylePin(el: HTMLButtonElement, parcel: Parcel, dimmed: boolean, selected: boolean) {
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

/** True if the point sits inside the map's view, ignoring an 8% edge. */
function inView(map: MapLibreMap, at: [number, number]) {
  const b = map.getBounds();
  const dx = (b.getEast() - b.getWest()) * 0.08;
  const dy = (b.getNorth() - b.getSouth()) * 0.08;
  return new LngLatBounds(
    [b.getWest() + dx, b.getSouth() + dy],
    [b.getEast() - dx, b.getNorth() - dy],
  ).contains(at);
}

export default function ParcelMap({
  parcels,
  visibleIds,
  selectedId,
  onSelect,
  publicSites,
  publicError,
  selectedPublicId,
  onSelectPublic,
  showSample,
  showPublic,
  onToggleLayer,
  unitGoal,
  topPublic,
  topNumbers,
  focus,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const topMarkersRef = useRef(new Map<number, Marker>());
  const popupRef = useRef<Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSelectPublicRef = useRef(onSelectPublic);
  // Set once the style has loaded. Every effect that adds sources or layers
  // waits on this instead of map.isStyleLoaded(), which is also false while
  // any tile is still streaming in.
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onSelectPublicRef.current = onSelectPublic;
  }, [onSelect, onSelectPublic]);

  // Effect 1: create the map once. Strict mode mounts twice, so clean up fully.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const markers = markersRef.current;
    const topMarkers = topMarkersRef.current;
    let loaded = false;
    const map = new MapLibreMap({
      container,
      style: STYLE_URL,
      bounds: INITIAL_BOUNDS,
      fitBoundsOptions: { padding: 24 },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      // Only a failure before the first load means the base map is missing.
      // A single bad tile later on is not worth a banner.
      if (!loaded) setMapError(e.error?.message ?? "Map failed to load");
    });
    map.on("load", () => {
      loaded = true;
      setMapError(null);
      setReady(true);
    });
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      for (const marker of topMarkers.values()) marker.remove();
      topMarkers.clear();
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Effect 2: diff the sample-site markers against the current props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const wanted = showSample ? parcels : [];
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
  }, [parcels, visibleIds, selectedId, showSample]);

  // Effect 3: bring the selected sample pin into view (only if off-screen).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId || !showSample) return;
    const parcel = parcels.find((p) => p.id === selectedId);
    if (!parcel) return;
    const at: [number, number] = [parcel.position.lng, parcel.position.lat];
    if (!inView(map, at)) map.easeTo({ center: at, duration: 500 });
  }, [selectedId, parcels, showSample]);

  // Effect 4: create the public layers once the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || map.getSource(HE_SOURCE)) return;
    map.addSource(HE_SOURCE, {
      type: "geojson",
      data: toFeatureCollection([], 0),
      cluster: true,
      clusterRadius: 44,
      clusterMaxZoom: 14,
      clusterProperties: { homes: ["+", ["get", "totalCapacity"]] },
    });
    map.addLayer({
      id: HE_CLUSTERS,
      type: "circle",
      source: HE_SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#6e6e73",
        "circle-opacity": 0.82,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 23, 400, 28],
      },
    });
    map.addLayer({
      id: HE_CLUSTER_COUNT,
      type: "symbol",
      source: HE_SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 11,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });
    map.addLayer({
      id: HE_POINTS,
      type: "circle",
      source: HE_SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "match",
          ["get", "goal"],
          "meets",
          planHex.meets,
          "below",
          planHex.below,
          planHex.unknown,
        ],
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        // Bigger dot for more planned homes.
        "circle-radius": ["interpolate", ["linear"], ["get", "totalCapacity"], 0, 4, 50, 7, 300, 11],
      },
    });
    map.addLayer({
      id: HE_SELECTED,
      type: "circle",
      source: HE_SOURCE,
      filter: ["==", ["get", "id"], -1],
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": 13,
        "circle-stroke-color": "#1c1c1e",
        "circle-stroke-width": 3,
      },
    });

    const onClusterClick = async (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId === undefined || feature?.geometry.type !== "Point") return;
      const source = map.getSource<GeoJSONSource>(HE_SOURCE);
      const zoom = await source?.getClusterExpansionZoom(clusterId);
      if (zoom === undefined) return;
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
    };
    const onPointClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "number") onSelectPublicRef.current(id);
    };
    const pointer = () => (map.getCanvas().style.cursor = "pointer");
    const unpointer = () => (map.getCanvas().style.cursor = "");
    map.on("click", HE_CLUSTERS, onClusterClick);
    map.on("click", HE_POINTS, onPointClick);
    for (const layer of [HE_CLUSTERS, HE_POINTS]) {
      map.on("mouseenter", layer, pointer);
      map.on("mouseleave", layer, unpointer);
    }
  }, [ready]);

  // Effect 5: keep the public data and visibility in step with the props.
  const publicData = useMemo(
    () => toFeatureCollection(publicSites ?? [], unitGoal),
    [publicSites, unitGoal],
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getSource<GeoJSONSource>(HE_SOURCE)?.setData(publicData);
    for (const layer of HE_LAYERS) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", showPublic ? "visible" : "none");
    }
  }, [ready, publicData, showPublic]);

  // Effect 7: numbered pins for the top public sites, matching the list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = topMarkersRef.current;
    const wanted = showPublic ? topPublic : [];
    const wantedIds = new Set(wanted.map((s) => s.id));
    for (const [id, marker] of markers) {
      if (!wantedIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    wanted.forEach((site, i) => {
      let marker = markers.get(site.id);
      if (!marker) {
        const wrapper = document.createElement("div");
        const pin = document.createElement("button");
        pin.type = "button";
        pin.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectPublicRef.current(site.id);
        });
        wrapper.append(pin);
        marker = new Marker({ element: wrapper, anchor: "center" })
          .setLngLat([site.lng, site.lat])
          .addTo(map);
        markers.set(site.id, marker);
      }
      const label = goalLabel(site, unitGoal);
      const selected = site.id === selectedPublicId;
      const wrapper = marker.getElement();
      const pin = wrapper.firstElementChild as HTMLButtonElement;
      const number = topNumbers?.[i] ?? i + 1;
      pin.textContent = String(number);
      // Rounded squares, so they never read as the round sample-site pins.
      pin.className = [
        "flex size-[26px] cursor-pointer items-center justify-center rounded-[7px] border-2 border-white text-[11px] font-bold text-white shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
        planBg[label],
        selected ? "ring-4 ring-ink/60" : "",
      ].join(" ");
      pin.setAttribute(
        "aria-label",
        `Public site ${number}: ${site.city}, APN ${site.apn ?? "unknown"}, ${
          site.totalCapacity ?? "unknown"
        } planned homes (${label === "meets" ? "meets" : label === "below" ? "below" : "unknown vs"} the ${unitGoal}-home goal)`,
      );
      pin.setAttribute("aria-pressed", selected ? "true" : "false");
      wrapper.style.zIndex = selected ? "9" : "1";
    });
  }, [topPublic, topNumbers, showPublic, unitGoal, selectedPublicId]);

  // Effect 8: frame the searched area. Refits only when the focus key changes
  // (cities picked or the data arriving), not on every render.
  const focusKey = focus?.key ?? null;
  const focusRef = useRef(focus);
  // Runs before the fit effect below (effects run in order), so it sees the latest bounds.
  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);
  useEffect(() => {
    const map = mapRef.current;
    const target = focusRef.current;
    if (!map || !ready || !target) return;
    const [[w, s], [e, n]] = target.bounds;
    const single = w === e && s === n;
    map.fitBounds(
      single
        ? [
            [w - 0.01, s - 0.01],
            [e + 0.01, n + 0.01],
          ]
        : target.bounds,
      { padding: 56, maxZoom: 14, duration: 800 },
    );
  }, [ready, focusKey]);

  // Effect 6: the selected public site gets a ring, a popup and comes into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    popupRef.current?.remove();
    popupRef.current = null;
    const site =
      showPublic && selectedPublicId !== null
        ? publicSites?.find((s) => s.id === selectedPublicId)
        : undefined;
    if (map.getLayer(HE_SELECTED)) {
      map.setFilter(HE_SELECTED, ["==", ["get", "id"], site ? site.id : -1]);
    }
    if (!site) return;
    const at: [number, number] = [site.lng, site.lat];
    // Zoom in far enough that the site is out of its cluster.
    if (map.getZoom() < 15 || !inView(map, at)) {
      map.easeTo({ center: at, zoom: Math.max(map.getZoom(), 15), duration: 600 });
    }
    const popup = new Popup({ closeButton: true, maxWidth: "260px", offset: 12 })
      .setLngLat(at)
      .setDOMContent(publicPopup(site))
      .addTo(map);
    popup.on("close", () => {
      if (popupRef.current === popup) onSelectPublicRef.current(null);
    });
    popupRef.current = popup;
  }, [ready, selectedPublicId, publicSites, showPublic]);

  const layerButton =
    "flex items-center gap-[6px] px-3 py-[7px] text-[11px] font-medium aria-pressed:bg-accent aria-pressed:text-white";

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[12px] bg-canvas lg:h-[740px]">
      {/* MapLibre's CSS forces `position: relative` on this element, so size it
          with h-full/w-full rather than absolute positioning (which collapses
          it to 0px tall and leaves a blank map). */}
      <div ref={containerRef} className="h-full w-full" />

      <div
        role="group"
        aria-label="Map layers"
        className="absolute top-3 left-3 z-10 flex divide-x divide-line overflow-hidden rounded-[10px] border border-line bg-surface text-ink-soft shadow-sm"
      >
        <button
          type="button"
          aria-pressed={showSample}
          onClick={() => onToggleLayer("sample")}
          className={`${layerButton} hover:bg-canvas`}
        >
          Sample sites ({parcels.length})
        </button>
        <button
          type="button"
          aria-pressed={showPublic}
          onClick={() => onToggleLayer("public")}
          className={`${layerButton} hover:bg-canvas`}
        >
          Public Housing Element sites ({publicSites?.length ?? "…"})
        </button>
      </div>

      <span className="absolute bottom-[34px] left-3 z-10 max-w-[calc(100%-24px)] rounded-[6px] bg-white/90 px-[9px] py-[5px] text-[10px] leading-[1.4] text-ink-soft shadow-sm">
        {showSample ? <>Sample pins: illustrative locations, not real parcels. </> : null}
        {showPublic ? (
          publicError ? (
            <>Public layer unavailable ({publicError}).</>
          ) : (
            <>
              Grey dots: real SCAG Housing Element sites, checked {publicMeta.checked}, no
              feasibility screen.
            </>
          )
        ) : null}
        {!showSample && !showPublic ? <>Both layers are off.</> : null}
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
