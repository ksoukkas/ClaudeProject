/**
 * Reads the aerial image of every located tax-defaulted and surplus-notice
 * site once and commits the result to src/lib/search/data/aerial-reads.json.
 *   npx tsx --env-file=.env.local scripts/aerial-batch.mts
 * Cached per id in .cache/aerial/, so reruns are cheap. Failed reads are left out.
 */
import fs from "node:fs";
import path from "node:path";

process.env.SCOUT_MODEL ||= "claude-haiku-5-5";

const { aerialRead, AERIAL_CAVEAT, imageryRef } = await import("../src/lib/search/aerial");
const { siteIndex } = await import("../src/lib/search/sites");

const OUT = path.join(process.cwd(), "src", "lib", "search", "data", "aerial-reads.json");
const BATCH = 3;
const PAUSE_MS = 1500;

const sites = siteIndex().sites.filter(
  (s) => (s.source === "tax-defaulted" || s.source === "surplus-notice") && s.lat !== null && s.lon !== null,
);
console.log(`Reading ${sites.length} sites with ${process.env.SCOUT_MODEL}`);

const reads: Record<string, { label: string; notes: string; model: string; readAt: string }> = {};
let failed = 0;
let lastFail = "";
let consecutive = 0;
for (let i = 0; i < sites.length; i += BATCH) {
  const chunk = sites.slice(i, i + BATCH);
  const out = await Promise.all(chunk.map((s) => aerialRead(s.id)));
  out.forEach((r, j) => {
    if (r.available && r.label && r.notes && r.model && r.readAt) {
      reads[chunk[j].id] = { label: r.label, notes: r.notes, model: r.model, readAt: r.readAt };
      consecutive = 0;
    } else {
      failed++;
      consecutive++;
      lastFail = r.caveat;
    }
  });
  if (consecutive >= 9) {
    console.error(`Stopping: ${consecutive} reads in a row failed. Last: ${lastFail}`);
    break;
  }
  if ((i / BATCH) % 10 === 0) console.log(`${Math.min(i + BATCH, sites.length)}/${sites.length}, ${failed} failed`);
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}

const models = [...new Set(Object.values(reads).map((r) => r.model))];
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: {
        imagery: imageryRef,
        model: models.join(", ") || process.env.SCOUT_MODEL,
        generatedOn: new Date().toISOString().slice(0, 10),
        caveat: AERIAL_CAVEAT,
      },
      reads,
    },
    null,
    1,
  ) + "\n",
);
const counts: Record<string, number> = {};
for (const r of Object.values(reads)) counts[r.label] = (counts[r.label] ?? 0) + 1;
console.log("Labels:", counts, "ok:", Object.keys(reads).length, "failed:", failed, "models:", models);
