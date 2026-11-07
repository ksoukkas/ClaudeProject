import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allCities,
  cityName,
  filterPublicSites,
  meetsGoal,
  readPublicSites,
  toFeatureCollection,
} from "./public-sites";
import { sampleCities } from "./sample-data";

const fixture = {
  features: [
    feature(1, "GARDEN GROVE", 120),
    feature(2, "BUENA PARK", 8),
    feature(3, "ORANGE COUNTY", null),
    feature(4, "GARDEN GROVE", 40),
    { id: 5, geometry: { type: "Polygon", coordinates: [0, 0] as [number, number] }, properties: props("ANAHEIM", 10) },
  ],
};

function props(jurisdiction: string, total: number | null) {
  return {
    apn: "000-000-00",
    apn24: "00000000",
    jurisdiction,
    lowIncomeCapacity: 0,
    moderateIncomeCapacity: 0,
    aboveModerateIncomeCapacity: total,
    totalCapacity: total,
    year: 2025,
  };
}
function feature(id: number, jurisdiction: string, total: number | null) {
  return {
    id,
    geometry: { type: "Point", coordinates: [-117.9, 33.8] as [number, number] },
    properties: props(jurisdiction, total),
  };
}

describe("public sites", () => {
  it("names cities the way the sample data does", () => {
    assert.equal(cityName("BUENA PARK"), "Buena Park");
    assert.equal(cityName("LA HABRA"), "La Habra");
    assert.equal(cityName("ORANGE COUNTY"), "Unincorporated Orange County");
    assert.equal(cityName(null), "Unknown");
  });

  it("knows every sample city plus the public jurisdictions", () => {
    for (const city of sampleCities) assert.ok(allCities.includes(city), city);
    assert.ok(allCities.includes("Irvine"));
    assert.deepEqual([...allCities], [...allCities].sort((a, b) => a.localeCompare(b)));
  });

  it("reads points and skips anything that is not a point", () => {
    const sites = readPublicSites(fixture);
    assert.deepEqual(sites.map((s) => s.id), [1, 2, 3, 4]);
    assert.equal(sites[2].city, "Unincorporated Orange County");
  });

  it("filters by city only, largest capacity first, unknown last", () => {
    const sites = readPublicSites(fixture);
    assert.deepEqual(filterPublicSites(sites, []).map((s) => s.id), [1, 4, 2, 3]);
    assert.deepEqual(filterPublicSites(sites, ["Garden Grove"]).map((s) => s.id), [1, 4]);
    assert.deepEqual(filterPublicSites(sites, ["Santa Ana"]), []);
  });

  it("labels the unit goal without hiding anything", () => {
    const [big, small, unknown] = readPublicSites(fixture).filter((s) => [1, 2, 3].includes(s.id));
    assert.equal(meetsGoal(big, 40), true);
    assert.equal(meetsGoal(small, 40), false);
    assert.equal(meetsGoal(unknown, 40), null);
  });

  it("builds map features that carry the id for popups", () => {
    const fc = toFeatureCollection(readPublicSites(fixture));
    assert.equal(fc.features.length, 4);
    assert.equal(fc.features[0].properties.id, 1);
    assert.equal(fc.features[2].properties.totalCapacity, 0);
  });
});
