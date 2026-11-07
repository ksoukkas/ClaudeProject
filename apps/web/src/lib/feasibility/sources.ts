import type { Source } from "./types";

/**
 * Every source a test can cite. URLs, statuses and check dates come from
 * lanes/1-find-it/data/DATA-SOURCES.md, lanes/1-find-it/data/pathways.json and
 * docs/background.md, which say they were checked on 2026-11-06. Entries marked
 * UNVERIFIED were not fetched; treat them as leads.
 */
const CHECKED = "2026-11-06";
const REPO = "https://github.com/ksoukkas/Unlot/blob/main";

function src(
  id: string,
  name: string,
  url: string,
  kind: Source["kind"],
  status: Source["status"],
  checked: string | null,
  note?: string,
): Source {
  return { id, name, url, kind, status, checked, note };
}

const LIST: Source[] = [
  // HCD fact sheets and guidance
  src(
    "hcd-sb9-factsheet",
    "HCD fact sheet: Duplexes and Lot Splits (SB 9)",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Page 1 read (DATA-SOURCES.md).",
  ),
  src(
    "hcd-sb9-implementation",
    "HCD SB 9 fact sheet (implementation)",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/sb-9-fact-sheet.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Title page read (DATA-SOURCES.md).",
  ),
  src(
    "hcd-law-factsheets",
    "HCD Housing Law Fact Sheets (combined, April 2026)",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Covers SB 9, SB 684 / SB 1123, AB 2011, SB 4 and more.",
  ),
  src(
    "hcd-sb4-factsheet",
    "HCD fact sheet: Faith and Higher Education Lands (SB 4)",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/aff-hsg-faith-higher-ed-sb-4.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Page 1 read (DATA-SOURCES.md).",
  ),
  src(
    "hcd-ab2011-draft-guidelines",
    "HCD draft AB 2011 guidelines",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/draft-ab-2011-guidelines.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Labelled Draft when checked (docs/background.md).",
  ),
  src(
    "hcd-sla-guidelines-2024",
    "HCD Surplus Land Act Guidelines (2024, final)",
    "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/final-updated-surplus-land-act-guidelines-2024.pdf",
    "fact-sheet",
    "VERIFIED",
    CHECKED,
    "Title page read; read it for the exact tests (DATA-SOURCES.md).",
  ),

  // Statute text. leginfo returned 403 to automated fetch on every URL tried.
  src(
    "leginfo-gov-65852-21",
    "Gov Code 65852.21 (SB 9 duplexes)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65852.21",
    "statute",
    "UNVERIFIED",
    null,
    "Section number from docs/background.md. leginfo blocks automated fetch; open in a browser.",
  ),
  src(
    "leginfo-gov-66411-7",
    "Gov Code 66411.7 (SB 9 lot splits)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66411.7",
    "statute",
    "UNVERIFIED",
    null,
    "Section number from docs/background.md. leginfo blocks automated fetch; open in a browser.",
  ),
  src(
    "leginfo-gov-66499-41",
    "Gov Code 66499.41 (SB 684 / SB 1123 map rule)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66499.41",
    "statute",
    "UNVERIFIED",
    null,
    "Linked from docs/background.md. leginfo blocks automated fetch; open in a browser.",
  ),
  src(
    "leginfo-gov-65912-101",
    "Gov Code 65912.101 (AB 2011)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65912.101",
    "statute",
    "UNVERIFIED",
    null,
    "Linked from pathways.json. leginfo blocks automated fetch; open in a browser.",
  ),
  src(
    "leginfo-gov-65913-16",
    "Gov Code 65913.16 (SB 4)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65913.16",
    "statute",
    "UNVERIFIED",
    null,
    "Section number from the HCD SB 4 fact sheet. leginfo blocks automated fetch; open in a browser.",
  ),
  src(
    "leginfo-civ-4751",
    "Civil Code 4751 (covenants and accessory dwelling units)",
    "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=4751",
    "statute",
    "UNVERIFIED",
    null,
    "Cited from memory of AB 670 (2019). Not fetched and not in the lane's source list. Verify before relying on it.",
  ),

  // Bill pages (CalMatters Digital Democracy), all HTTP 200 on 2026-11-06
  src("calmatters-sb9", "CalMatters Digital Democracy: SB 9 (2021)", "https://calmatters.digitaldemocracy.org/bills/ca_202120220sb9", "bill-page", "VERIFIED", CHECKED),
  src("calmatters-sb684", "CalMatters Digital Democracy: SB 684 (2023)", "https://calmatters.digitaldemocracy.org/bills/ca_202320240sb684", "bill-page", "VERIFIED", CHECKED),
  src("calmatters-sb1123", "CalMatters Digital Democracy: SB 1123 (2023)", "https://calmatters.digitaldemocracy.org/bills/ca_202320240sb1123", "bill-page", "VERIFIED", CHECKED),
  src("calmatters-ab2011", "CalMatters Digital Democracy: AB 2011", "https://calmatters.digitaldemocracy.org/bills/ca_201920200ab2011", "bill-page", "VERIFIED", CHECKED, "URL as listed in DATA-SOURCES.md."),
  src("calmatters-sb4", "CalMatters Digital Democracy: SB 4 (2023)", "https://calmatters.digitaldemocracy.org/bills/ca_202320240sb4", "bill-page", "VERIFIED", CHECKED),

  // Data layers
  src("scag-zoning", "SCAG Zoning_poly_OR (zoning per parcel, all 34 OC cities)", "https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer", "data-layer", "VERIFIED", CHECKED, "Fields: APN24, CITY, ZN24_CITY, ZN24_SCAG, ACRES, SLOPE. Max 2,000 records per request."),
  src("anaheim-propertyinfo", "City of Anaheim PropertyInfo (parcels, zoning, general plan)", "https://gis.anaheim.net/map/rest/services/PropertyInfo/MapServer", "data-layer", "VERIFIED", CHECKED),
  src("oc-parcels", "OC Public Works Parcels (countywide)", "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/FeatureServer/0", "data-layer", "VERIFIED", CHECKED, "APN, site address, year built, bedrooms. No owner name, no lot-size field (compute from geometry)."),
  src("oc-building-footprints", "OC Building Footprints", "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Building_Footprints/MapServer/0", "data-layer", "VERIFIED", CHECKED),
  src("scag-existing-land-use", "SCAG Existinglanduse_poly_OR (existing land use per parcel)", "https://maps.scag.ca.gov/scaggis/rest/services/LDX/Existinglanduse_poly_OR/MapServer", "data-layer", "VERIFIED", CHECKED, "Listed; fields not inspected."),
  src("fema-nfhl", "FEMA National Flood Hazard Layer", "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer", "data-layer", "VERIFIED", CHECKED, "Layer 28: FLD_ZONE, SFHA_TF. Slow; retry the first call."),
  src("oc-floodplains", "OC Floodplains (county copy)", "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Floodplains/MapServer/0", "data-layer", "VERIFIED", CHECKED),
  src("calfire-fhsz", "CAL FIRE Fire Hazard Severity Zones (statewide)", "https://services.gis.ca.gov/arcgis/rest/services/Environment/Fire_Severity_Zones/MapServer", "data-layer", "VERIFIED", CHECKED, "Older zone vintages."),
  src("oc-fhsz-lra", "OC Fire Hazard Severity Zones, LRA (county copy)", "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Fire_Hazard_Severity_Zones_LRA/MapServer/0", "data-layer", "VERIFIED", CHECKED),
  src("oc-liquefaction", "OC Liquefaction zones (CGS, county copy)", "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Liquefaction/MapServer/0", "data-layer", "VERIFIED", CHECKED),
  src("cgs-seismic-hazards", "CGS Seismic Hazards (fault and liquefaction zones)", "https://maps.conservation.ca.gov/cgs/EQZApp/", "data-layer", "UNVERIFIED", CHECKED, "403 to automated fetch; REST service returned Token Required."),
  src("caltrans-hqta", "Caltrans CA High Quality Transit Areas", "https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHrailroad/CA_HQ_Transit_Areas/FeatureServer/0", "data-layer", "VERIFIED", CHECKED),
  src("osm-place-of-worship", "OpenStreetMap amenity=place_of_worship", "https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dplace_of_worship", "data-layer", "VERIFIED", CHECKED, "Tag docs verified; a live Overpass query failed (server at capacity). A proxy for ownership, not a fact."),
  src("irs-eo-bmf", "IRS Exempt Organizations Business Master File", "https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf", "data-layer", "VERIFIED", CHECKED, "Page loads; file not downloaded. A proxy for ownership, not a fact."),
  src("hcd-surplus-notices", "HCD Surplus Land Act Notices of Availability (data.ca.gov)", "https://data.ca.gov/dataset/surplus-land-act-notices-of-availability-received", "data-layer", "VERIFIED", CHECKED, "CSV downloaded and parsed; last modified 2026-10-30."),

  // Repo documents
  src("repo-pathways-json", "lanes/1-find-it/data/pathways.json (this repo)", `${REPO}/lanes/1-find-it/data/pathways.json`, "repo-doc", "VERIFIED", CHECKED, "Note: SB 684 / SB 1123 lot-size limits differ by source and by bill."),
  src("repo-background", "docs/background.md (this repo)", `${REPO}/docs/background.md`, "repo-doc", "VERIFIED", CHECKED, "One-paragraph law summaries that stay close to HCD fact sheets."),
  src("repo-data-sources", "lanes/1-find-it/data/DATA-SOURCES.md (this repo)", `${REPO}/lanes/1-find-it/data/DATA-SOURCES.md`, "repo-doc", "VERIFIED", CHECKED),
];

export const SOURCES: Record<string, Source> = Object.fromEntries(LIST.map((s) => [s.id, s]));

/** Never throws: an unknown id comes back as an UNVERIFIED placeholder so the report still renders. */
export function getSource(id: string): Source {
  return (
    SOURCES[id] ?? {
      id,
      name: `Unregistered source: ${id}`,
      url: "",
      kind: "repo-doc",
      status: "UNVERIFIED",
      checked: null,
      note: "Add this id to src/lib/feasibility/sources.ts.",
    }
  );
}
