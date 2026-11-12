"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteResult, SiteSource } from "@/lib/search/types";
import { SOURCE_COLOR, SOURCE_LABEL, SOURCE_ORDER } from "./shared";

export const USGS_ATTRIBUTION =
  'Imagery: <a href="https://www.usgs.gov/" target="_blank" rel="noreferrer">U.S. Geological Survey</a>, The National Map (public domain)';

const STREET_STYLE = "https://tiles.openfreemap.org/styles/positron";
const USGS_TILES =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
const OC_CENTER: [number, number] = [-117.83, 33.72];

type Basemap = "street" | "aerial";

function toCollection(results: SiteResult[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: results
      .filter((r) => r.lat != null && r.lon != null)
      .map((r) => ({
        type: "Feature" as const,
        properties: { id: r.id, color: SOURCE_COLOR[r.source] },
        geometry: { type: "Point" as const, coordinates: [r.lon as number, r.lat as number] },
      })),
  };
}

export default function SiteMap({
  results,
  selectedId,
  hoveredId,
  onSelect,
}: {
  results: SiteResult[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("aerial");
  const [failed, setFailed] = useState(false);
  const onSelectRef = useRef(onSelect);
  const resultsRef = useRef(results);
  const lastHover = useRef<string | null>(null);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    resultsRef.current = results;
  });

  const collection = useMemo(() => toCollection(results), [results]);
  const locatedCount = collection.features.length;

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    // The ESM build needs its worker served as a plain file (copied by predev/prebuild).
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: container.current,
      style: STREET_STYLE,
      center: OC_CENTER,
      zoom: 9.3,
      attributionControl: false,
    });
    // Tile hiccups are normal; only a style that has not loaded after 15 s is fatal.
    const giveUp = setTimeout(() => setFailed(true), 15_000);
    map.on("load", () => clearTimeout(giveUp));
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      map.addSource("usgs-imagery", {
        type: "raster",
        tiles: [USGS_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: USGS_ATTRIBUTION,
      });
      map.addLayer({
        id: "aerial",
        type: "raster",
        source: "usgs-imagery",
        layout: { visibility: "visible" },
      });
      map.addSource("sites", { type: "geojson", data: toCollection(resultsRef.current), promoteId: "id" });
      map.addLayer({
        id: "sites-halo",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 15, 0],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "sites-dots",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 9, 6],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.on("click", "sites-dots", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "sites-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "sites-dots", () => {
        map.getCanvas().style.cursor = "";
      });
      setReady(true);
    });

    return () => {
      clearTimeout(giveUp);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Basemap toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("aerial", "visibility", basemap === "aerial" ? "visible" : "none");
  }, [basemap, ready]);

  // New results: update points and fit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("sites") as maplibregl.GeoJSONSource).setData(collection);
    lastHover.current = null;
    lastSelected.current = null;
    if (collection.features.length > 0) {
      const b = new maplibregl.LngLatBounds();
      for (const f of collection.features) {
        b.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
      }
      map.fitBounds(b, { padding: 70, maxZoom: 14, duration: 600 });
    }
  }, [collection, ready]);

  // Highlight hovered + selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: string | null, active: boolean) => {
      if (!id) return;
      try {
        map.setFeatureState({ source: "sites", id }, { active });
      } catch {
        /* feature not on the map (no coordinates) */
      }
    };
    set(lastHover.current, false);
    set(lastSelected.current, false);
    lastHover.current = hoveredId;
    lastSelected.current = selectedId;
    set(hoveredId, true);
    set(selectedId, true);
  }, [hoveredId, selectedId, ready, collection]);

  // Fly to the selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const s = resultsRef.current.find((r) => r.id === selectedId);
    if (s && s.lat != null && s.lon != null) {
      map.flyTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 16), duration: 900 });
    }
  }, [selectedId, ready]);

  const present = SOURCE_ORDER.filter((s) => results.some((r) => r.source === s && r.lat != null));
  const legendSources: SiteSource[] = present.length > 0 ? present : SOURCE_ORDER;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[16px] border border-line bg-canvas">
      {/* Inline style: maplibre's own CSS sets position: relative on this node. */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} aria-label="Map of search results" />

      <div className="absolute top-3 left-3 flex rounded-[10px] border border-line bg-surface p-0.5 text-[12px] font-semibold shadow-sm">
        {(["street", "aerial"] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={basemap === b}
            onClick={() => setBasemap(b)}
            className={`rounded-[8px] px-3 py-1.5 transition-colors ${
              basemap === b ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas"
            }`}
          >
            {b === "street" ? "Street" : "Aerial"}
          </button>
        ))}
      </div>

      <div className="absolute bottom-7 left-3 rounded-[10px] border border-line bg-surface/95 px-3 py-2 text-[11px] text-ink-soft shadow-sm">
        <ul className="flex flex-col gap-1">
          {legendSources.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-line"
                style={{ background: SOURCE_COLOR[s] }}
              />
              {SOURCE_LABEL[s]}
            </li>
          ))}
        </ul>
      </div>

      {failed ? (
        <p className="absolute inset-x-3 top-14 rounded-[10px] border border-line bg-surface p-3 text-[12px] text-ink-soft">
          The map could not load. Results are still listed.
        </p>
      ) : ready && results.length > 0 && locatedCount === 0 ? (
        <p className="absolute inset-x-3 top-14 rounded-[10px] border border-line bg-surface p-3 text-[12px] text-ink-soft">
          None of these results have coordinates, so nothing can be plotted.
        </p>
      ) : null}
    </div>
  );
}
