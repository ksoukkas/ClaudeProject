import type { ParcelFacts } from "./types";

/**
 * SYNTHETIC test parcels. Nothing here describes a real property.
 * Every value (lot size, zoning, hazards, year built, coverage) is made up so
 * the report renders and each verdict path can be seen. ASSUMPTION throughout.
 * No APNs, no addresses. Source ids name the layer that WOULD supply the value.
 */
export const SYNTHETIC_PARCELS: ParcelFacts[] = [
  {
    id: "synthetic-001",
    label: "Synthetic parcel 1 (no real address)",
    synthetic: true,
    city: "Anaheim",
    apn: null,
    lotSqft: 7200, // ASSUMPTION
    lotSqftSourceId: "oc-parcels",
    zoning: [
      {
        sourceId: "scag-zoning",
        code: "SYN-SF",
        description: "Single family residential (synthetic)",
        category: "single-family",
      },
    ],
    existingUse: { sourceId: "scag-existing-land-use", value: "Single family residence (synthetic)" },
    vacant: { sourceId: "scag-existing-land-use", value: "no" },
    buildingCoveragePct: 28, // ASSUMPTION
    hazards: {
      veryHighFire: [{ sourceId: "oc-fhsz-lra", value: "no" }],
      floodSfha: [{ sourceId: "fema-nfhl", value: "no" }],
    },
    inHqta: { sourceId: "caltrans-hqta", value: "yes" },
    adjacentIndustrial: { sourceId: "scag-existing-land-use", value: "no" },
    inUrbanizedArea: null,
    historicDistrict: null,
    tenantOccupiedLast3Years: null,
    owner: { type: "unknown", basis: "unknown" },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: null,
    yearBuilt: 1962, // ASSUMPTION
    localCode: null,
    plan: { homes: 4, affordability: "unknown" },
  },
  {
    id: "synthetic-002",
    label: "Synthetic parcel 2 (no real address)",
    synthetic: true,
    city: "Anaheim",
    apn: null,
    lotSqft: 43000, // ASSUMPTION
    lotSqftSourceId: "oc-parcels",
    zoning: [
      {
        sourceId: "scag-zoning",
        code: "SYN-C",
        description: "Commercial (synthetic)",
        category: "commercial",
      },
      {
        sourceId: "anaheim-propertyinfo",
        code: "SYN-MU",
        description: "Mixed use overlay (synthetic)",
        category: "mixed-use",
      },
    ],
    existingUse: {
      sourceId: "scag-existing-land-use",
      value: "Retail strip with surface parking (synthetic)",
    },
    vacant: { sourceId: "scag-existing-land-use", value: "no" },
    buildingCoveragePct: 18, // ASSUMPTION
    hazards: {
      veryHighFire: [{ sourceId: "calfire-fhsz", value: "no" }],
      floodSfha: [
        { sourceId: "fema-nfhl", value: "yes", detail: "synthetic disagreement" },
        { sourceId: "oc-floodplains", value: "no", detail: "synthetic disagreement" },
      ],
    },
    inHqta: { sourceId: "caltrans-hqta", value: "yes" },
    adjacentIndustrial: { sourceId: "scag-existing-land-use", value: "unknown" },
    inUrbanizedArea: null,
    historicDistrict: null,
    tenantOccupiedLast3Years: null,
    owner: {
      type: "private",
      basis: "proxy",
      sourceId: "oc-parcels",
      detail: "no owner field in the free parcel layer; assumed private (ASSUMPTION)",
    },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: { sourceId: "hcd-surplus-notices", value: "no" },
    yearBuilt: 1978, // ASSUMPTION
    localCode: {
      citation: "SYNTHETIC code section (not a real ordinance)",
      url: null,
      text: "SYNTHETIC EXAMPLE, NOT A REAL ORDINANCE: Within the SYN-C zone, retail sales, offices and surface parking are permitted uses. Residential uses above the ground floor require approval under the mixed use overlay.",
      plainEnglish: null,
    },
    plan: { homes: 40, affordability: "100-lower" },
  },
  {
    id: "synthetic-003",
    label: "Synthetic parcel 3 (no real address)",
    synthetic: true,
    city: "Anaheim",
    apn: null,
    lotSqft: 65000, // ASSUMPTION
    lotSqftSourceId: "oc-parcels",
    zoning: [
      {
        sourceId: "scag-zoning",
        code: "SYN-SF",
        description: "Single family residential (synthetic)",
        category: "single-family",
      },
    ],
    existingUse: {
      sourceId: "scag-existing-land-use",
      value: "Place of worship with surface parking (synthetic)",
    },
    vacant: { sourceId: "scag-existing-land-use", value: "no" },
    buildingCoveragePct: 22, // ASSUMPTION
    hazards: {
      veryHighFire: [{ sourceId: "oc-fhsz-lra", value: "yes" }],
      floodSfha: [{ sourceId: "fema-nfhl", value: "no" }],
      faultZone: [
        {
          sourceId: "cgs-seismic-hazards",
          value: "unknown",
          detail: "layer requires a token; not queried",
        },
      ],
    },
    inHqta: { sourceId: "caltrans-hqta", value: "no" },
    adjacentIndustrial: { sourceId: "scag-existing-land-use", value: "no" },
    inUrbanizedArea: null,
    historicDistrict: null,
    tenantOccupiedLast3Years: null,
    owner: {
      type: "religious",
      basis: "proxy",
      sourceId: "osm-place-of-worship",
      detail: "worship-site tag inside the parcel (synthetic)",
    },
    perimeterUrbanPct: null,
    hoaOrCcrs: null,
    publicSurplusNotice: null,
    yearBuilt: 1955, // ASSUMPTION
    localCode: null,
    plan: { homes: 30, affordability: "100-lower" },
  },
];
