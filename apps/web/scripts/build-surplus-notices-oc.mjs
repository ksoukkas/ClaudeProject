#!/usr/bin/env node
/**
 * Build the Orange County subset of the HCD Surplus Land Act notices CSV.
 *
 * Usage:
 *   node scripts/build-surplus-notices-oc.mjs <noa_information.csv> <oc-cities.json> <out.json>
 *
 * Download the CSV yourself first (resource URL below); this script never
 * fetches. It drops the contact column (staff names, emails, phones) and two
 * free-text columns, and withholds address and coordinates for rows whose
 * existing use reads as a home. Re-run it to refresh the cached subset.
 */
import fs from "node:fs";
import path from "node:path";

const RESOURCE_URL =
  "https://publish.data.ca.gov/dataset/0a52a6d9-4c1f-4905-8d25-6117c60c35c8/resource/bb81599a-e130-48aa-a6e3-bbcce9392d4f/download/noa_information.csv";
const DATASET_URL = "https://data.ca.gov/dataset/surplus-land-act-notices-of-availability-received";

/** 1 acre = 43,560 square feet (standard conversion). */
const SQFT_PER_ACRE = 43560;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }
  return rows;
}

function parseDate(s) {
  const t = (s || "").trim();
  let m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function parseAcres(s) {
  const t = (s || "").trim();
  const m = t.match(/([\d,]*\.?\d+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (/\b(sf|sq\.?\s*ft|square)/i.test(t)) return Math.round((n / SQFT_PER_ACRE) * 1000) / 1000;
  return n;
}

function num(s) {
  const n = parseFloat((s || "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Privacy rule, applied to the existing-use text with phrases about
 * neighbours removed: withhold when it says "occupied" (and not
 * "unoccupied"), or when it names a house, home, dwelling, apartment or
 * residence without saying vacant, undeveloped, unimproved or former.
 */
export function readsAsHome(use) {
  const own = use.replace(/(bordered by|between|adjacent to|next to|near|surrounded by|across)[^.;|]*/gi, "");
  if (/occupied/i.test(own) && !/unoccupied/i.test(own)) return true;
  if (
    /resid|dwelling|house|home|apartment|mobile\s*home/i.test(own) &&
    !/vacant|unoccupied|undeveloped|unimproved|former/i.test(own)
  ) {
    return true;
  }
  return false;
}

const PRIVACY_RULE =
  "withheld when the existing use says \"occupied\" (not \"unoccupied\"), or names a house, home, dwelling, apartment or residence without saying vacant, undeveloped, unimproved or former; text about neighbouring uses is ignored";

function main() {
  const [csvPath, citiesPath, outPath] = process.argv.slice(2);
  if (!csvPath || !citiesPath || !outPath) {
    console.error("usage: node scripts/build-surplus-notices-oc.mjs <csv> <oc-cities.json> <out.json>");
    process.exit(2);
  }
  let text = fs.readFileSync(csvPath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = parseCsv(text);
  const header = rows[0];
  const H = Object.fromEntries(header.map((h, i) => [h, i]));
  const data = rows.slice(1);

  const cityNames = JSON.parse(fs.readFileSync(citiesPath, "utf8")).cities.map((c) => c.name);
  const lower = cityNames.map((n) => n.toLowerCase());

  function matchOc(row) {
    const city = (row[H["City"]] || "").trim().toLowerCase();
    const agency = (row[H["Local Agency"]] || "").trim().toLowerCase();
    if (lower.includes(city)) return "city";
    if (/orange cove/.test(agency)) return null; // Fresno County city, not OC
    if (lower.some((n) => agency === n || agency === `city of ${n}`)) return "agency";
    if (/\borange county\b|county of orange/.test(agency)) return "agency";
    return null;
  }

  const notices = [];
  let n = 0;
  let withheld = 0;
  for (const r of data) {
    if (!matchOc(r)) continue;
    n++;
    const use = (r[H["Existing Use/Vacancy"]] || "").trim();
    const hide = readsAsHome(use);
    if (hide) withheld++;
    notices.push({
      id: `sla-${String(n).padStart(3, "0")}`,
      parentCase: (r[H["Parent Case"]] || "").trim(),
      agencyType: (r[H["Local Agency Type"]] || "").trim(),
      agency: (r[H["Local Agency"]] || "").trim(),
      apnRaw: (r[H["APN"]] || "").trim(),
      dateIssued: parseDate(r[H["Date Notice Issued"]]),
      dateIssuedRaw: (r[H["Date Notice Issued"]] || "").trim(),
      dueDate: parseDate(r[H["NOA Due Date"]]),
      dueDateRaw: (r[H["NOA Due Date"]] || "").trim(),
      status: (r[H["NOA Status"]] || "").trim(),
      noticeUrl: (r[H["Notice Website Link"]] || "").trim() || null,
      address: hide ? "" : (r[H["Address"]] || "").trim(),
      addressWithheld: hide
        ? "Reads as a home: address and coordinates withheld. Open the notice on data.ca.gov."
        : null,
      city: (r[H["City"]] || "").trim(),
      zip: (r[H["Zip"]] || "").trim(),
      lon: hide ? null : num(r[H["x"]]),
      lat: hide ? null : num(r[H["y"]]),
      sizeRaw: (r[H["Parcel Size (Gross Acres)"]] || "").trim(),
      sizeAcres: parseAcres(r[H["Parcel Size (Gross Acres)"]]),
      generalPlanZoning: (r[H["General Plan/Zoning"]] || "").trim(),
      existingUse: use,
    });
  }

  const out = {
    provenance: {
      dataset: "Surplus Land Act Notices of Availability Received (California HCD)",
      datasetUrl: DATASET_URL,
      resourceUrl: RESOURCE_URL,
      license: "Other (Public Domain), as stated on data.ca.gov",
      resourceLastModified: "2026-11-06T16:54:03Z",
      fetched: "2026-11-07",
      totalRowsStatewide: data.length,
      rowsKept: notices.length,
      rowsAddressWithheld: withheld,
      filter:
        "Rows whose City is one of the 34 Orange County cities (lanes/2-clear-it/data/oc-cities.json), or whose Local Agency is an OC city, 'City of <OC city>', 'County of Orange' or an 'Orange County' agency. Rows with a blank City and a non-OC agency are not kept, so this subset can miss OC parcels.",
      privacy: `${withheld} rows have address and coordinates withheld so no resident's home is pointed at: ${PRIVACY_RULE}. APN, agency and dates are kept. The contact column was dropped for every row. Built by apps/web/scripts/build-surplus-notices-oc.mjs.`,
      columnsDropped: [
        "Notice Contact Information- Concatenated (personal contact details; open the notice on data.ca.gov instead)",
        "Additional Info (free text)",
        "Consolidated Sites (free text)",
      ],
      derivedFields: [
        "dateIssued, dueDate: ISO dates parsed from MM-DD-YYYY; raw values kept",
        "sizeAcres: first number in the size text; values marked SF or square feet divided by 43,560; null when unparseable",
        "addressWithheld: set, and address/lon/lat blanked, by the privacy rule above",
        "id: sla-NNN, assigned in file order",
      ],
    },
    notices,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`kept ${notices.length} of ${data.length}; withheld ${withheld}; wrote ${outPath}`);
  console.log("withheld uses:", notices.filter((x) => x.addressWithheld).map((x) => `${x.id}: ${x.existingUse}`));
}

main();
