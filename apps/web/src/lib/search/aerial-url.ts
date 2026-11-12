// Pure and import-free: safe for client components.
// Imagery: USGS National Map NAIP ImageServer (exportImage), public domain per
// https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
// (read 2026-11-12); credit USGS, USDA. Capture date at a point is unknown here.
export const NAIP_URL = "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer";
/** ASSUMPTION: a chip about 150 m across shows a lot and its neighbours; not a policy figure. */
export const CHIP_METERS = 150;

/** Same chip the model sees, so the UI can show it without a key. */
export function aerialImageUrl(lat: number, lon: number, sizePx = 512): string {
  const dLat = CHIP_METERS / 2 / 111_320;
  const dLon = CHIP_METERS / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(6)).join(",");
  const size = Math.round(Math.min(2000, Math.max(64, sizePx)));
  return `${NAIP_URL}/exportImage?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${size},${size}&format=jpg&f=image`;
}
