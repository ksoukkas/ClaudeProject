/** Small geometry helpers for ArcGIS polygons in WGS84 (outSR=4326). */

export type Ring = [number, number][];

/** Area-weighted centroid of the largest ring; vertex mean as a fallback. */
export function polygonCentroid(rings: Ring[] | undefined): [number, number] | null {
  if (!rings?.length) return null;
  let best: { a: number; x: number; y: number } | null = null;
  for (const ring of rings) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x0, y0] = ring[j];
      const [x1, y1] = ring[i];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    if (a === 0) continue;
    const entry = { a: Math.abs(a), x: cx / (3 * a), y: cy / (3 * a) };
    if (!best || entry.a > best.a) best = entry;
  }
  if (best) return [round6(best.x), round6(best.y)];
  const pts = rings.flat();
  if (!pts.length) return null;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  return [round6(sx / pts.length), round6(sy / pts.length)];
}

/** Even-odd ray casting across all rings, so holes are respected. */
export function pointInPolygon([x, y]: [number, number], rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
