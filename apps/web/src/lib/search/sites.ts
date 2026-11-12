/**
 * Normalises the three loaded datasets into SiteResult[]. Server-only (reads
 * the cached housing-element file). Built once, memoised in module scope.
 * Nothing is invented: a field the source does not give stays null.
 */
import fs from "node:fs";
import path from "node:path";
import { listCandidates } from "@/lib/chapter8/candidates";
import { listSource } from "@/lib/chapter8/county-list";
import { canonicalFocusCity } from "@/lib/focus";
import { listNotices, noticeProvenance } from "@/lib/market/notices";
import geo from "./data/tax-defaulted-geo.json";
import type { PathwayHit, SiteResult, SourceRef } from "./types";

export const SOURCE_LABELS = {
  "tax-defaulted": "County tax-defaulted list",
  "surplus-notice": "Surplus Land Act notice",
  "housing-element": "Housing-element site",
} as const;

const SB4_URL = "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/aff-hsg-faith-higher-ed-sb-4.pdf";
const SB4_LABEL = "SB 4 (faith / higher-education land)";
const SB4_UNKNOWN = "Ownership is not in any dataset loaded";
const PLACE_OF_WORSHIP = /\b(church|chapel|synagogue|mosque|temple|parish|congregation|place of worship)\b/i;

const GEO = new Map(geo.parcels.map((p) => [p.apn, p]));

export const taxSourceRef: SourceRef = {
  name: "OC Treasurer-Tax Collector tax-defaulted list (Exhibit I, sale #1398)",
  url: listSource.url,
  checkedAt: listSource.fetchedOn,
};
export const geoSourceRef: SourceRef = {
  name: "OC Public Works Parcels (coordinates and area computed from geometry)",
  url: geo.source.url,
  checkedAt: geo.source.fetchedOn,
};

function sb4Hit(useText: string | null): PathwayHit {
  if (useText && PLACE_OF_WORSHIP.test(useText)) {
    return {
      id: "sb4",
      label: SB4_LABEL,
      status: "possible",
      reason: `The recorded existing-use text mentions a place of worship ("${useText.slice(0, 80)}"); who owns the land is not stated, so confirm ownership.`,
      sourceUrl: SB4_URL,
    };
  }
  return { id: "sb4", label: SB4_LABEL, status: "unknown", reason: SB4_UNKNOWN, sourceUrl: SB4_URL };
}

function taxSites(): SiteResult[] {
  return listCandidates(new Date()).map((c) => {
    const p = c.parcel;
    const g = GEO.get(p.apn);
    const vacant = p.propertyType === "unimproved";
    return {
      id: `tax-defaulted:${p.apn}`,
      source: "tax-defaulted",
      apn: p.apn,
      city: p.city,
      address: g?.address && !/not available/i.test(g.address) ? g.address : null,
      lat: g?.lat ?? null,
      lon: g?.lon ?? null,
      acres: g?.acres ?? null,
      facts: [
        `Minimum bid $${p.minimumBid.toLocaleString("en-US")}`,
        vacant ? "Unimproved (vacant land)" : "Improved (has a building)",
        `Tax-defaulted since ${p.taxDefaultedOn}`,
        `Cucumber score ${c.score.total}/100 (${c.score.tierLabel})`,
      ],
      pathways: [
        {
          id: "chapter8",
          label: "Chapter 8 agreement sale",
          status: "possible",
          reason: `On the county's tax-defaulted list. ${c.deadlineNote} UNVERIFIED legal basis: as this tool understands the Revenue and Taxation Code, a nonprofit may ask to buy a tax-defaulted parcel by agreement for low-income housing; read the statute and ask the tax collector.`,
          sourceUrl: "https://www.octreasurer.gov/taxauction",
        },
        sb4Hit(null),
      ],
      score: c.score.total,
      detailHref: `/chapter8/${p.apn}`,
      sourceRef: taxSourceRef,
    };
  });
}

function noticeSites(): { sites: SiteResult[]; ref: SourceRef } {
  const prov = noticeProvenance();
  const ref: SourceRef = { name: prov.dataset, url: prov.datasetUrl, checkedAt: prov.fetched };
  const sites = listNotices({ allCities: true }).map((n): SiteResult => {
    const active = n.status === "Active";
    const due = n.dueDate ? `due date recorded as ${n.dueDate}` : "no due date recorded";
    const city = canonicalFocusCity(n.city) ?? (n.city?.trim() || canonicalFocusCity(n.agency));
    const facts = [`Agency: ${n.agency}`, `Notice status: ${n.status || "unknown"}`];
    if (n.existingUse) facts.push(`Existing use: ${n.existingUse}`);
    if (n.generalPlanZoning) facts.push(`General plan / zoning: ${n.generalPlanZoning}`);
    return {
      id: `surplus-notice:${n.id}`,
      source: "surplus-notice",
      apn: n.apnRaw?.trim() || null,
      // The HCD file spells Westminster two ways; fold the misspelling in.
      city: (city === "Westminister" ? "Westminster" : city) || null,
      address: n.address?.trim() || null,
      lat: n.lat,
      lon: n.lon,
      acres: n.sizeAcres,
      facts,
      pathways: [
        {
          id: "sla",
          label: "Surplus Land Act notice",
          status: active ? "likely" : "possible",
          reason: `HCD notice ${n.parentCase || n.id} from ${n.agency}: status "${n.status || "unknown"}", ${due}, as recorded. ${active ? "" : "Not Active, so the offer may be closed; confirm with the agency. "}No other deadline is claimed.`,
          sourceUrl: n.noticeUrl || prov.datasetUrl,
        },
        sb4Hit(n.existingUse),
      ],
      score: null,
      detailHref: null,
      sourceRef: ref,
    };
  });
  return { sites, ref };
}

type HeFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    apn?: string | null;
    jurisdiction?: string | null;
    lowIncomeCapacity?: number;
    moderateIncomeCapacity?: number;
    aboveModerateIncomeCapacity?: number;
    totalCapacity?: number;
  };
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

const HE_FALLBACK_REF: SourceRef = {
  name: "SCAG adopted housing-element sites",
  url: "https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0",
  checkedAt: "unknown",
};

function heSites(warnings: string[]): { sites: SiteResult[]; ref: SourceRef } {
  const dir = path.join(process.cwd(), "public", "data");
  let features: HeFeature[] = [];
  let ref = HE_FALLBACK_REF;
  try {
    features = (JSON.parse(fs.readFileSync(path.join(dir, "he-sites.geojson"), "utf8")) as { features: HeFeature[] }).features;
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "he-sites.meta.json"), "utf8")) as {
      source?: string;
      sourceUrl?: string;
      checked?: string;
    };
    ref = { name: meta.source ?? ref.name, url: meta.sourceUrl ?? ref.url, checkedAt: meta.checked ?? "unknown" };
  } catch {
    warnings.push("Housing-element site file could not be read, so those sites are missing from results.");
  }
  const seen = new Map<string, number>();
  const withCap = features.map((f) => {
    const pr = f.properties ?? {};
    const apn = pr.apn?.trim() || null;
    const base = apn ?? "no-apn";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const cap = typeof pr.totalCapacity === "number" ? pr.totalCapacity : null;
    const jur = pr.jurisdiction?.trim() || null;
    const [lon, lat] = f.geometry?.coordinates ?? [null, null];
    const facts = [cap !== null ? `Housing-element capacity: ${cap} units` : "Housing-element capacity: unknown"];
    if (cap !== null) {
      facts.push(
        `Lower income ${pr.lowIncomeCapacity ?? "unknown"}, moderate ${pr.moderateIncomeCapacity ?? "unknown"}, above moderate ${pr.aboveModerateIncomeCapacity ?? "unknown"}`,
      );
    }
    const site: SiteResult = {
      id: `housing-element:${base}${n > 1 ? `#${n}` : ""}`,
      source: "housing-element",
      apn,
      city: jur ? (canonicalFocusCity(jur) ?? titleCase(jur)) : null,
      address: null,
      lat: typeof lat === "number" ? lat : null,
      lon: typeof lon === "number" ? lon : null,
      acres: null,
      facts,
      pathways: [
        {
          id: "housing-element",
          label: "On the city's housing-element site list",
          status: "likely",
          reason:
            cap !== null
              ? `Listed in the adopted housing element with a capacity of ${cap} units. This is a planning listing, not an approval.`
              : "Listed in the adopted housing element; capacity is unknown.",
          sourceUrl: ref.url,
        },
        sb4Hit(null),
      ],
      score: null,
      detailHref: null,
      sourceRef: ref,
    };
    return { site, cap: cap ?? 0 };
  });
  // Highest capacity first, then APN, for a deterministic order.
  withCap.sort((a, b) => b.cap - a.cap || (a.site.apn ?? "").localeCompare(b.site.apn ?? "") || a.site.id.localeCompare(b.site.id));
  return { sites: withCap.map((x) => x.site), ref };
}

export interface SiteIndex {
  sites: SiteResult[];
  byId: Map<string, SiteResult>;
  sources: SourceRef[];
  warnings: string[];
}

let memo: SiteIndex | null = null;

export function siteIndex(): SiteIndex {
  if (memo) return memo;
  const warnings: string[] = [];
  const tax = taxSites().sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.apn ?? "").localeCompare(b.apn ?? ""));
  const notices = noticeSites();
  const he = heSites(warnings);
  const sites = [...tax, ...notices.sites, ...he.sites];
  const missing = tax.filter((s) => s.lat === null).length;
  if (missing > 0) {
    warnings.push(`${missing} of ${tax.length} tax-defaulted parcels were not found in the county parcel layer, so they have no coordinates.`);
  }
  memo = {
    sites,
    byId: new Map(sites.map((s) => [s.id, s])),
    sources: [taxSourceRef, geoSourceRef, notices.ref, he.ref],
    warnings,
  };
  return memo;
}
