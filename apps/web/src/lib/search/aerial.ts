/**
 * Aerial image chip + one-label AI reading. Server-only.
 *
 * Imagery: USGS National Map NAIP ImageServer (exportImage). USGS says its
 * authored data are in the U.S. public domain and asks for credit
 * (https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits,
 * read 2026-11-12). The capture date of the chip at a given point is NOT
 * read here, so every answer says "unknown capture date".
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_TIMEOUT_MS, hasAnthropicKey, scoutModel } from "@/lib/scout/config";
import { CHIP_METERS, NAIP_URL, aerialImageUrl } from "./aerial-url";
import { siteIndex } from "./sites";
import type { AerialLabel, AerialRead, SourceRef } from "./types";

export { NAIP_URL, CHIP_METERS, aerialImageUrl };
export const NAIP_CHECKED = "2026-11-12";

export const AERIAL_CAVEAT =
  "This is an AI reading of an aerial image of unknown capture date, not a site inspection. It says nothing about ownership, zoning or legality.";

export const imageryRef: SourceRef = {
  name: "USGS National Map NAIP imagery (public domain; credit USGS, USDA)",
  url: NAIP_URL,
  checkedAt: NAIP_CHECKED,
};

const LABELS: AerialLabel[] = ["vacant-lot", "parking-lot", "building-intact", "building-possibly-distressed", "unclear"];

const SYSTEM = `You look at one aerial image chip, roughly 150 m across, centred on a site, for a housing-site screening tool.
Rules:
- Describe only what is visible. Say nothing about ownership, zoning, legality, value or who lives there.
- Choose exactly one label:
  "vacant-lot": open land with no building at the centre.
  "parking-lot": a paved lot for vehicles at the centre.
  "building-intact": a building at the centre with no visible signs of damage.
  "building-possibly-distressed": use ONLY for visible signs such as a missing or collapsed roof, debris, or heavy overgrowth on or around a building.
  "unclear": when you are unsure, the image is blurry or the centre cannot be made out.
- Add one or two sentences in "notes" on what is visible. Reply with JSON only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "notes"],
  properties: { label: { type: "string", enum: LABELS }, notes: { type: "string" } },
} as const;

function unavailable(id: string, why: string): AerialRead {
  return { id, available: false, label: null, notes: null, model: null, caveat: `${why} ${AERIAL_CAVEAT}`, imagery: null, readAt: null };
}

const cacheDir = () => path.join(process.cwd(), ".cache", "aerial");
const cacheFile = (id: string) => path.join(cacheDir(), `${id.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);

function readCached(id: string): AerialRead | null {
  try {
    const r = JSON.parse(fs.readFileSync(cacheFile(id), "utf8")) as AerialRead;
    return r.id === id && r.available && LABELS.includes(r.label as AerialLabel) ? r : null;
  } catch {
    return null;
  }
}

function writeCached(r: AerialRead) {
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(cacheFile(r.id), JSON.stringify(r));
  } catch {
    // Cache is best-effort.
  }
}

/** Parse the model's reply; anything outside the label list becomes "unclear". */
export function parseAerialReply(text: string): { label: AerialLabel; notes: string } {
  try {
    const o = JSON.parse(text) as { label?: unknown; notes?: unknown };
    const label = LABELS.includes(o.label as AerialLabel) ? (o.label as AerialLabel) : "unclear";
    const notes = typeof o.notes === "string" ? o.notes.trim().slice(0, 400) : "";
    return { label, notes: notes || "No description returned." };
  } catch {
    return { label: "unclear", notes: "The reading could not be parsed." };
  }
}

export async function aerialRead(id: string): Promise<AerialRead> {
  const site = siteIndex().byId.get(id);
  if (!site) return unavailable(id, "No site with this id.");
  if (site.lat === null || site.lon === null) return unavailable(id, "This site has no coordinates, so no image can be read.");
  if (!hasAnthropicKey()) return unavailable(id, "No ANTHROPIC_API_KEY is configured, so no reading was made.");

  const hit = readCached(id);
  if (hit) return hit;

  try {
    const imgRes = await fetch(aerialImageUrl(site.lat, site.lon, 768), {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "cucumber-hackathon-prototype" },
    });
    const type = imgRes.headers.get("content-type") ?? "";
    if (!imgRes.ok || !type.startsWith("image/")) return unavailable(id, "The aerial image could not be fetched from USGS.");
    const data = Buffer.from(await imgRes.arrayBuffer()).toString("base64");

    const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: scoutModel(),
      max_tokens: 500,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            { type: "text", text: "Label the site at the centre of this image." },
          ],
        },
      ],
    });
    const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const { label, notes } = parseAerialReply(text);
    const result: AerialRead = {
      id,
      available: true,
      label,
      notes,
      model: response.model || scoutModel(),
      caveat: AERIAL_CAVEAT,
      imagery: imageryRef,
      readAt: new Date().toISOString(),
    };
    writeCached(result);
    return result;
  } catch (err) {
    console.error("[aerial-read]", id, err instanceof Error ? `${err.name}: ${err.message}` : err);
    return unavailable(id, "The reading failed (image or Claude API error); try again later.");
  }
}
