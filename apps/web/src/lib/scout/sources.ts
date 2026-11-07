/**
 * Sources the scout reads, with the date each was checked and how.
 * Framework-free: safe to import from client components.
 *
 * VERIFIED = we ran a real query on the checked date and the fields and
 * values matched what the scout expects. UNVERIFIED = a lead only.
 */

export type SourceStatus = "VERIFIED" | "UNVERIFIED";

export type SourceId = "scag-he" | "caltrans-hqta" | "scag-zoning" | "hcd-sites";

export type ScoutSource = {
  id: SourceId;
  name: string;
  publisher: string;
  url: string;
  checked: string;
  status: SourceStatus;
  /** What we actually checked, in plain words. */
  how: string;
  /** Exact fields the scout reads. */
  fields: string[];
};

export const SCAG_HE_LAYER =
  "https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0";
export const CALTRANS_HQTA_LAYER =
  "https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHrailroad/CA_HQ_Transit_Areas/FeatureServer/0";
export const SCAG_ZONING_LAYER =
  "https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer/0";

export const scoutSources: Record<SourceId, ScoutSource> = {
  "scag-he": {
    id: "scag-he",
    name: "SCAG housing element sites (HousingElementSite_poly_scag, layer 0)",
    publisher: "Southern California Association of Governments",
    url: SCAG_HE_LAYER,
    checked: "2026-11-07",
    status: "VERIFIED",
    how:
      "Read layer metadata (?f=json) and queried COUNTY='Orange': 2,126 sites in 28 jurisdictions, all YEAR=2025. Anaheim returned 124 sites with APNs and capacity values. Santa Ana, Costa Mesa, Huntington Beach, Orange, Tustin, Laguna Woods and Rancho Santa Margarita returned 0 sites.",
    fields: [
      "PID24",
      "APN24",
      "Assessor_Parcel_Number",
      "Jurisdiction",
      "COUNTY",
      "Low_Income_HE_Capacity",
      "Moderate_Income_HE_Capacity",
      "Above_Moderate_Income_HE_Capacity",
      "Total_HE_Capacity",
      "YEAR",
      "Shape.STArea()",
    ],
  },
  "caltrans-hqta": {
    id: "caltrans-hqta",
    name: "Caltrans California High Quality Transit Areas (layer 0)",
    publisher: "Caltrans",
    url: CALTRANS_HQTA_LAYER,
    checked: "2026-11-07",
    status: "VERIFIED",
    how:
      "Read layer metadata and ran a multipoint intersect with six Anaheim site centroids: 8 polygons returned (OCTA major bus stops and an HQ bus corridor, plus one MPO-planned stop). Layer description says corridors are estimated from GTFS headways of 20 minutes or less.",
    fields: ["hqta_type", "hqta_details", "agency_primary", "route_id"],
  },
  "scag-zoning": {
    id: "scag-zoning",
    name: "SCAG zoning by parcel (Zoning_poly_OR, layer 0)",
    publisher: "Southern California Association of Governments",
    url: SCAG_ZONING_LAYER,
    checked: "2026-11-07",
    status: "VERIFIED",
    how:
      "Queried by PID24 for three Anaheim housing-element parcels: each returned CITY, ACRES and a local zoning code (ZN24_CITY). Dataset YEAR=2024. The regional code ZN24_SCAG is not shown because its legend was not checked.",
    fields: ["PID24", "CITY", "ACRES", "ZN24_CITY", "YEAR"],
  },
  "hcd-sites": {
    id: "hcd-sites",
    name: "HCD Housing Element Sites Inventory",
    publisher: "California Department of Housing and Community Development",
    url: "https://hcd.ca.gov/housing-element/sites-inventory",
    checked: "2026-11-06",
    status: "VERIFIED",
    how:
      "Listed as VERIFIED in lanes/1-find-it/data/DATA-SOURCES.md (checked 2026-11-06 by the organizers). The official place to confirm a city's adopted inventory.",
    fields: [],
  },
};

/** A link that opens the exact public record for one parcel. */
export function recordUrl(layer: string, pid24: string): string {
  const params = new URLSearchParams({
    where: `PID24='${pid24}'`,
    outFields: "*",
    returnGeometry: "false",
    f: "html",
  });
  return `${layer}/query?${params.toString()}`;
}
