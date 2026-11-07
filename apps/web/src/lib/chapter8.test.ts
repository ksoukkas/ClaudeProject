import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHAPTER8_TESTS, assessParcel, findParcel, parcels, sortedParcels } from "./chapter8";

const today = "2026-11-07";

describe("Chapter 8 data", () => {
  it("keeps the 108 land parcels and no timeshares or addresses", () => {
    assert.equal(parcels.length, 108);
    assert.equal(parcels.filter((p) => p.propertyType === "unimproved").length, 44);
    for (const p of parcels) {
      assert.match(p.apn, /^\d{3}-\d{3}-\d{2}$/);
      assert.deepEqual(Object.keys(p).sort(), [
        "apn",
        "city",
        "minimumBid",
        "powerToSellOn",
        "propertyType",
        "taxDefaultedOn",
      ]);
    }
  });
  it("matches the bid totals printed on the exhibit", () => {
    const total = (type: string) =>
      parcels.filter((p) => p.propertyType === type).reduce((s, p) => s + p.minimumBid, 0);
    assert.equal(total("improved"), 5_506_700);
    assert.equal(total("unimproved"), 912_100);
  });
  it("lists vacant land first", () => {
    assert.equal(sortedParcels()[0].propertyType, "unimproved");
  });
});

describe("Chapter 8 tests", () => {
  const parcel = parcels[0];

  it("answers only what the list can answer", () => {
    const r = assessParcel(parcel, today);
    const outcome = (id: string) => r.rows.find((row) => row.test.id === id)?.outcome;
    assert.equal(outcome("on_tax_defaulted_list"), "Pass");
    assert.equal(outcome("power_to_sell_started"), "Pass");
    for (const id of [
      "still_unsold",
      "nonprofit_eligible",
      "intended_use_qualifies",
      "county_and_controller_approval",
    ]) {
      assert.equal(outcome(id), "Unknown");
    }
    assert.equal(r.counts.total, CHAPTER8_TESTS.length);
  });
  it("is Check 4 at Low confidence on a 2025 list", () => {
    const r = assessParcel(parcel, today);
    assert.equal(r.statusLabel, "Check 4");
    assert.equal(r.level, "Low");
  });
  it("asks whether the parcel is still unsold first", () => {
    assert.match(assessParcel(parcel, today).next, /sold at the June 2025 auction/);
  });
  it("fails the power-to-sell test before that date", () => {
    const r = assessParcel({ ...parcel, powerToSellOn: "2030-01-01" }, today);
    assert.equal(r.status, "Red flag");
  });
  it("marks the list as past its age limit", () => {
    const row = assessParcel(parcel, today).rows.find((x) => x.test.id === "on_tax_defaulted_list");
    assert.equal(row?.stale, true);
  });
  it("finds a parcel by its number", () => {
    assert.equal(findParcel(parcel.apn)?.apn, parcel.apn);
    assert.equal(findParcel("000-000-00"), undefined);
  });
});
