/**
 * EVERYTHING HERE IS FICTIONAL.
 *
 * Evidence rows for the five sample sites. Each row comes only from text
 * already in `sample-data.ts`, or from a limit in law-rules.json. A test
 * with no such text has no row here, so it is Unknown. No row cites a real
 * layer or a real record.
 *
 * Sample documents state no data date, except where the name says so, so
 * `dataAsOf` is null and they count as unknown vintage. SNAPSHOT_ISO is when
 * the workspace was put together, not the date of the data, so it is not used
 * as one.
 */
import { computeConfidence } from "./confidence";
import {
  RULES_CHECKED,
  SB9_MIN_SQFT_TO_SPLIT,
  SITE_TESTS,
  lawNeedsVerify,
  testsForLaw,
} from "./law-tests";
import { SNAPSHOT_ISO, parcels } from "./sample-data";
import type {
  ConfidenceResult,
  Id,
  RawCheck,
  Reading,
  SourceKind,
  TestDef,
} from "./types";

const SQFT_PER_ACRE = 43_560; // Unit conversion, not an assumption.

function sampleReading(
  outcome: Reading["outcome"],
  name: string,
  kind: SourceKind,
  note: string,
  extra: Partial<Reading> = {},
): Reading {
  return {
    outcome,
    note,
    source: { name, tier: "official", kind, dataAsOf: null, sample: true },
    ...extra,
  };
}

/** Compares the sample acreage with the SB 9 limit in law-rules.json. */
function lotSizeCheck(acres: number): RawCheck {
  const sqft = Math.round(acres * SQFT_PER_ACRE);
  const limit = SB9_MIN_SQFT_TO_SPLIT;
  return {
    testId: "split_lot_size",
    readings: [
      sampleReading(
        sqft >= limit ? "Pass" : "Fail",
        `Sample acreage (${acres.toFixed(2)} acres), SB 9 limit from our law rules`,
        "parcels",
        `About ${sqft.toLocaleString("en-US")} sq ft against a ${limit.toLocaleString("en-US")} sq ft minimum.`,
        { measure: { value: sqft, limit } },
      ),
    ],
  };
}

function acresOf(id: Id): number {
  const parcel = parcels.find((p) => p.id === id);
  if (!parcel) throw new Error(`No sample parcel "${id}"`);
  return parcel.acres;
}

const sampleSites: Record<Id, { checks: RawCheck[]; extraTests?: TestDef[] }> = {
  "olive-commons": {
    checks: [
      {
        // Stays Unknown under R3: SB 4 ownership needs a person to confirm it.
        testId: "owned_by_qualifying_institution",
        readings: [
          sampleReading(
            "Pass",
            "Sample deed D-01 (2020)",
            "title_document",
            "Sample deed shows eligible nonprofit religious ownership before the statutory cutoff.",
          ),
        ],
      },
    ],
  },
  "civic-orchard": {
    checks: [
      {
        testId: "zoned_commercial",
        readings: [
          sampleReading(
            "Pass",
            "Sample zoning + AB 2011 screen",
            "zoning",
            "Commercial zoning screen passes.",
          ),
        ],
      },
    ],
  },
  "laurel-court": {
    checks: [
      {
        testId: "zoned_single_family",
        readings: [
          sampleReading(
            "Pass",
            "Sample parcel + SB 9 screen",
            "zoning",
            "Single-family zoning fits an SB 9 screen.",
          ),
        ],
      },
      lotSizeCheck(acresOf("laurel-court")),
    ],
  },
  "lantern-way": { checks: [] },
  "juniper-mews": {
    // The SB 9 list has no easement test, so this site carries one of its own.
    extraTests: [SITE_TESTS.usable_building_envelope],
    checks: [
      lotSizeCheck(acresOf("juniper-mews")),
      {
        testId: "usable_building_envelope",
        readings: [
          sampleReading(
            "Fail",
            "Sample easement exhibit",
            "title_document",
            "Sample recorded access easement covers the buildable area. No usable envelope identified.",
          ),
        ],
      },
    ],
  },
};

const results = new Map<Id, ConfidenceResult>(
  parcels.map((parcel) => {
    const site = sampleSites[parcel.id];
    if (!site) throw new Error(`No sample checks for "${parcel.id}"`);
    return [
      parcel.id,
      computeConfidence({
        tests: [...testsForLaw(parcel.law), ...(site.extraTests ?? [])],
        checks: site.checks,
        today: SNAPSHOT_ISO,
        rulesCheckedOn: RULES_CHECKED,
        lawVerify: lawNeedsVerify(parcel.law),
      }),
    ];
  }),
);

/** The computed result for a sample site, or undefined if it was never screened. */
export function sampleConfidence(parcelId: Id | undefined): ConfidenceResult | undefined {
  return parcelId ? results.get(parcelId) : undefined;
}
