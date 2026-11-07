/**
 * The site tests for each law. AB 2011 and SB 684 / SB 1123 read their test
 * lists from law-rules.json. SB 9 adds its zoning and lot-size gates. SB 4
 * has no `tests` array there, so its 14 tests are listed here.
 *
 * Project conditions (affordability, labor, density, height) are shown but
 * never scored. Their values are read from law-rules.json.
 */
import rules from "./law-rules.json";
import type { LawId, TestDef } from "./types";

type LawRule = {
  id: string;
  name: string;
  tests?: string[];
  verify?: string;
  lot?: { min_sqft_to_split?: number; max_acres?: number | null };
  units?: { max_total?: number; max_avg_net_sqft?: number };
  affordability?: {
    lower_income_share: number;
    max_moderate_share: number;
    max_staff_share: number;
    deed_years_rental: number;
    deed_years_ownership: number;
  };
  labor?: string;
  min_density_du_per_acre_oc?: { residential_zone: number; non_residential_zone: number };
  min_density_du_per_acre_metro?: Record<string, number>;
  height?: string;
  height_ft?: { corridor_under_100ft: number; corridor_100ft_plus: number };
};

const lawRules = rules.laws as unknown as LawRule[];

function rule(id: string): LawRule {
  const found = lawRules.find((l) => l.id === id);
  if (!found) throw new Error(`No law "${id}" in law-rules.json`);
  return found;
}

export const RULES_CHECKED: string = rules.checked;

const catalog: TestDef[] = [
  // Zoning and lot
  { id: "zoned_single_family", label: "Zoned single-family", action: "Confirm the zoning with the city", group: "Zoning and lot", scope: "public", gate: true },
  { id: "split_lot_size", label: "Lot is big enough to split", action: "Confirm the lot size from a survey or parcel record", group: "Zoning and lot", scope: "public", gate: true },
  { id: "zoned_commercial", label: "Zoned for a qualifying commercial use", action: "Confirm the zoning with the city", group: "Zoning and lot", scope: "public" },
  { id: "corridor_frontage", label: "Fronts a qualifying corridor", action: "Measure the corridor frontage", group: "Zoning and lot", scope: "public", layerGap: true },

  // Ownership and title
  { id: "owned_by_qualifying_institution", label: "Owned by a qualifying institution", action: "Have counsel confirm the owner qualifies", group: "Ownership and title", scope: "human_only" },
  { id: "no_conservation_easement", label: "No conservation easement", action: "Check a current title report for a conservation easement", group: "Ownership and title", scope: "human_only" },
  { id: "no_renter_last_3_years", label: "No renter in the last 3 years", action: "Ask the owner about tenants in the last 3 years", group: "Ownership and title", scope: "human_only" },
  { id: "not_previously_sb9_split", label: "Not already split under SB 9", action: "Check the lot history with the city", group: "Ownership and title", scope: "human_only" },
  { id: "not_historic_district", label: "Not in a historic district", action: "Ask the city about historic status", group: "Ownership and title", scope: "human_only" },

  // Hazards
  { id: "not_very_high_fire_zone", label: "Not in a very high fire zone", action: "Check the current fire hazard map", group: "Hazards", scope: "public" },
  { id: "not_flood_zone", label: "Not in a flood zone", action: "Check the current flood map", group: "Hazards", scope: "public" },
  { id: "not_special_flood_hazard_area", label: "Not in a special flood hazard area", action: "Check the current flood map", group: "Hazards", scope: "public" },
  { id: "not_regulatory_floodway", label: "Not in a regulatory floodway", action: "Check the current flood map for a floodway", group: "Hazards", scope: "public" },
  { id: "not_earthquake_fault_zone", label: "Not in an earthquake fault zone", action: "Check the current fault zone map", group: "Hazards", scope: "public" },
  { id: "not_hazardous_waste_site", label: "Not a hazardous waste site", action: "Search for a hazardous waste listing", group: "Hazards", scope: "public", layerGap: true },

  // Surroundings
  { id: "perimeter_75pct_urban", label: "At least 75% of the perimeter is urban", action: "Measure what borders the site", group: "Surroundings", scope: "public", layerGap: true },
  { id: "substantially_surrounded_by_urban_uses", label: "Substantially surrounded by urban uses", action: "Measure what borders the site", group: "Surroundings", scope: "public", layerGap: true },
  { id: "not_next_to_industrial", label: "Not next to an industrial use", action: "Check what borders the site", group: "Surroundings", scope: "public", layerGap: true },
  { id: "heavy_industrial_1200ft", label: "No heavy industrial use within 1,200 ft", action: "Check for heavy industrial uses nearby", group: "Surroundings", scope: "public", layerGap: true },
  { id: "title_v_industrial_1600ft", label: "No Title V industrial site within 1,600 ft", action: "Check for Title V industrial sites nearby", group: "Surroundings", scope: "public", layerGap: true },
  { id: "oil_gas_refinery_3200ft", label: "No oil or gas refinery within 3,200 ft", action: "Check for refineries nearby", group: "Surroundings", scope: "public", layerGap: true },

  // Land and habitat
  { id: "not_wetlands", label: "Not wetlands", action: "Check for wetlands on the site", group: "Land and habitat", scope: "public", layerGap: true },
  { id: "not_farmland", label: "Not farmland", action: "Check for a farmland designation", group: "Land and habitat", scope: "public", layerGap: true },
  { id: "not_habitat_conservation", label: "Not in a habitat conservation area", action: "Check for a habitat conservation plan", group: "Land and habitat", scope: "public", layerGap: true },
];

/** Every per-law test the app knows about, by id. */
export const TEST_CATALOG: Record<string, TestDef> = Object.fromEntries(
  catalog.map((t) => [t.id, t]),
);

/** Not one of the plan's per-law tests: added only where a site's sample text needs it. */
export const SITE_TESTS = {
  usable_building_envelope: {
    id: "usable_building_envelope",
    label: "Recorded easements leave a usable building area",
    action: "Verify the easement with a title report and survey",
    group: "Ownership and title",
    scope: "human_only",
  },
} satisfies Record<string, TestDef>;

const SB9_TESTS = [
  "zoned_single_family",
  "split_lot_size",
  "not_very_high_fire_zone",
  "not_historic_district",
  "no_renter_last_3_years",
  "not_previously_sb9_split",
];

const SB4_TESTS = [
  "owned_by_qualifying_institution",
  "no_conservation_easement",
  "perimeter_75pct_urban",
  "not_very_high_fire_zone",
  "not_special_flood_hazard_area",
  "not_regulatory_floodway",
  "heavy_industrial_1200ft",
  "not_earthquake_fault_zone",
  "not_wetlands",
  "not_farmland",
  "not_hazardous_waste_site",
  "not_habitat_conservation",
  "title_v_industrial_1600ft",
  "oil_gas_refinery_3200ft",
];

function testIds(law: LawId): string[] {
  switch (law) {
    case "SB9":
      return SB9_TESTS;
    case "SB4":
      return SB4_TESTS;
    case "AB2011":
      return rule("AB2011").tests ?? [];
    case "SB684_SB1123":
      // Only tests both laws share: a lot that fails SB 1123 may still fit SB 684.
      return (rule("SB684").tests ?? []).filter((id) => rule("SB1123").tests?.includes(id));
  }
}

/**
 * The tests for a law. Pass `homesPlanned` only when it is known: the SB 9 lot
 * split test drops out when 2 homes or fewer are planned.
 */
export function testsForLaw(law: LawId, options: { homesPlanned?: number } = {}): TestDef[] {
  const { homesPlanned } = options;
  return testIds(law)
    .filter((id) => !(id === "split_lot_size" && homesPlanned !== undefined && homesPlanned <= 2))
    .map((id) => {
      const test = TEST_CATALOG[id];
      if (!test) throw new Error(`Test "${id}" is missing from TEST_CATALOG`);
      return test;
    });
}

/** True when law-rules.json flags the law's summary for verification. */
export function lawNeedsVerify(law: LawId): boolean {
  return law === "AB2011" && Boolean(rule("AB2011").verify);
}

/** SB 9 minimum lot size to split, from law-rules.json. */
export const SB9_MIN_SQFT_TO_SPLIT = (() => {
  const limit = rule("SB9").lot?.min_sqft_to_split;
  if (limit === undefined) throw new Error("law-rules.json has no SB 9 minimum lot size");
  return limit;
})();

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** Shown but not scored. Text is built from law-rules.json only. */
export function projectConditions(law: LawId): { label: string; value: string }[] {
  const unknown = "Unknown. Not in our rules file yet.";
  switch (law) {
    case "SB4": {
      const r = rule("SB4");
      const a = r.affordability;
      const d = r.min_density_du_per_acre_oc;
      return [
        {
          label: "Affordability",
          value: a
            ? `Lower-income share ${percent(a.lower_income_share)}, moderate up to ${percent(a.max_moderate_share)}, staff up to ${percent(a.max_staff_share)}. Deed term ${a.deed_years_rental} years rental, ${a.deed_years_ownership} years ownership.`
            : unknown,
        },
        { label: "Labor", value: r.labor ?? unknown },
        {
          label: "Density",
          value: d
            ? `At least ${d.residential_zone} homes per acre in a residential zone, ${d.non_residential_zone} in a non-residential zone.`
            : unknown,
        },
        { label: "Height", value: r.height ?? unknown },
      ];
    }
    case "AB2011": {
      const r = rule("AB2011");
      const tiers = Object.values(r.min_density_du_per_acre_metro ?? {});
      const h = r.height_ft;
      return [
        { label: "Affordability", value: unknown },
        { label: "Labor", value: unknown },
        {
          label: "Density",
          value: tiers.length
            ? `At least ${Math.min(...tiers)} to ${Math.max(...tiers)} homes per acre, depending on the site.`
            : unknown,
        },
        {
          label: "Height",
          value: h
            ? `${h.corridor_under_100ft} ft or ${h.corridor_100ft_plus} ft depending on corridor width, or current zoning if greater.`
            : unknown,
        },
      ];
    }
    case "SB9": {
      const u = rule("SB9").units;
      return [{ label: "Homes", value: u?.max_total ? `Up to ${u.max_total} in total with a lot split.` : unknown }];
    }
    case "SB684_SB1123": {
      const u = rule("SB684").units;
      return [
        {
          label: "Homes",
          value: u?.max_total
            ? `Up to ${u.max_total}, average up to ${u.max_avg_net_sqft?.toLocaleString("en-US")} net sq ft.`
            : unknown,
        },
        ...(rule("SB1123").tests?.includes("vacant")
          ? [{ label: "SB 1123 only", value: "Needs a vacant lot. SB 684 does not list this test." }]
          : []),
      ];
    }
  }
}
