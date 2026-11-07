# Honest confidence: build plan

Confidence is computed from evidence. It is never typed in. A test with no data is Unknown, never
Pass. This plan merges four research passes run on 2026-11-07. Every threshold below is an
ASSUMPTION: no statute gives these numbers. Label them ASSUMPTION in the code, the UI and the README.

## What changes for the user

- Each site shows a computed confidence badge and Pass / Fail / Unknown per test, with source and
  as-of date, plus why confidence is what it is and what would raise it.
- Confidence means "how much can you trust this answer", not "how good is this site".
- A site can be a Red flag with High confidence.

## Decisions (where the research disagreed)

1. **Sample data caps at Low, including Fails.** Fictional evidence is not evidence, so
   `juniper-mews` is a Red flag at Low, not High. To keep the demo meaningful, the result also
   carries `uncappedLevel`, and the UI says "Would be Medium on real records. Capped at Low because
   this is fictional sample data."
2. **Tests are per law, not a uniform 5.** A uniform short list flatters sites. SB 4 has 14 scored
   tests, SB 9 has 6. Group the rows in the UI so a long list stays readable.
3. **Rank is not recomputed in this slice.** The raw formula rewards laws with more tests, which is
   a separate decision for the team.
4. **Status and confidence stay separate.** Status: any Fail is Red flag, else any Unknown is
   Check N, else Looks good. Do not derive Fail from `Finding.tone`: the easement's `tone: "blocked"`
   would create a false Fail.
5. **No new facts.** Sample rows come only from text already in `sample-data.ts` or limits in
   `apps/web/src/lib/law-rules.json`. Everything else is Unknown. Sample results never cite real layers such as
   FEMA or CAL FIRE.

## Rubric

### Normalize each test first

| Rule | Input | Becomes |
|---|---|---|
| R1 | No evidence, query error, timeout | Unknown |
| R2 | Proxy source (land use, worship map, IRS file) | Unknown + `lead`. Never Pass or Fail |
| R3 | Pass on a `human_only` test without a human source | Unknown. A public Fail still stands |
| R4 | "Not in zone" Pass from zero features, without `coverageConfirmed` | Unknown |
| R5 | Sources disagree | Unknown + `conflict`, both shown |
| R6 | Value inside the borderline band, or a sliver overlap | Unknown + `borderline` |
| R7 | Pass from a superseded layer | Unknown. A Fail stands, marked stale |

### computeConfidence

Project conditions (affordability, labor, density, height) are shown but not scored.

- **Any Fail:** grade each Fail on its own and keep the best. Start at High, then apply caps. Other
  Unknowns do not lower it. Human-only open tests do not matter here.
- **No Fail:** any gate test Unknown gives Not enough data. Otherwise `coverage` = answered public
  tests / public tests, with `human_only` tests excluded from the denominator and `layer_gap` tests
  included. 0 Unknown gives High, coverage >= 0.75 gives Medium, coverage >= 1/3 gives Low, below
  that gives Not enough data.
- **Caps, in order:** sample source caps at Low; secondary source caps at Medium; law with a verify
  flag (AB 2011) caps at Medium; any stale source or stale rules drops one tier once, floor Low.

### Constants (all ASSUMPTION)

`MEDIUM_COVERAGE` 0.75 · `LOW_COVERAGE` 1/3 · `BORDERLINE_PCT` 2% · `SLIVER_PCT` 5% of parcel area ·
max age: surplus notices 90 days, parcels and footprints 24 months, zoning and land use 36 months,
FEMA and fire maps 60 months, human confirmation 365 days, law rules 180 days. Unknown vintage
counts as stale. Staleness uses the source's `dataAsOf`, not the fetch date. Today's date is passed
in, so the functions stay pure.

## Tests per law

**SB 9 (6):** `zoned_single_family` (gate, public), `split_lot_size` (gate, public, dropped when
homes planned <= 2), `not_very_high_fire_zone` (public), `not_historic_district` (human_only),
`no_renter_last_3_years` (human_only), `not_previously_sb9_split` (human_only).

**SB 4 (14):** `owned_by_qualifying_institution` (human_only), `no_conservation_easement`
(human_only), `perimeter_75pct_urban`, `not_very_high_fire_zone`, `not_special_flood_hazard_area`,
`not_regulatory_floodway`, `heavy_industrial_1200ft`, `not_earthquake_fault_zone`, `not_wetlands`,
`not_farmland`, `not_hazardous_waste_site`, `not_habitat_conservation`,
`title_v_industrial_1600ft`, `oil_gas_refinery_3200ft`. SB 4 has no `tests` array in
`apps/web/src/lib/law-rules.json`, so this list lives in `law-tests.ts`.

**AB 2011, SB 684 / SB 1123:** use the `tests` in `apps/web/src/lib/law-rules.json`. Mark anything without a
listed layer `layer_gap`.

## Files (under `apps/web/src`)

New: `lib/thresholds.ts`, `lib/law-tests.ts`, `lib/confidence.ts`, `lib/sample-checks.ts` (header:
EVERYTHING HERE IS FICTIONAL), `components/confidence-badge.tsx`,
`components/confidence-breakdown.tsx`. Extend `lib/types.ts`. Keep `lib/` framework-free.

Change:

- `lib/sample-data.ts`: delete `Parcel.confidence` and the typed level words, keep evidence text.
  HOA "Clear" becomes Unknown. SB 4 "Qualifies" with open tests must not read as a Pass.
- `components/results-workspace.tsx`: badge, "N of M tests unknown", "Next: ...".
- `components/ui.tsx`: "Likely feasible" becomes "No red flags so far".
- `app/results/page.tsx`: note that confidence is worked out from the tests.
- `app/results/[id]/page.tsx`: breakdown in both branches, so all 5 sites work.
- `app/results/[id]/memo/page.tsx`: remove all typed levels, keep it to one printed page, keep
  disclaimers inside `data-print-root`.
- `components/saved-pipeline.tsx`: computed badge via `parcelId`; the 3 cards without one show
  "Not screened yet".
- `app/about/page.tsx`: `id="confidence"` section with the rule, labelled ASSUMPTION.
- `components/site-footer.tsx`: link to `/about`.
- `apps/web/README.md`, `lib/README.md`: document the rule and new files.
- `app/page.tsx`: fix copy the app cannot back up, such as "LIVE SCREEN" and "Every match includes
  its reasoning and sources".

Copy: plain language for a nonprofit with no GIS team. Badge: High / Medium / Low confidence, Not
enough data, Not screened yet. Low body must say: "Low does not mean this is a bad site. It means we
do not know enough yet." A failed site at High must say High means we are sure about the problem.
The breakdown has a hard-coded strip: "Fictional sample. These results come from made-up documents,
not real records." Do not colour the badge by level: Red for Low clashes with a High Red flag.

## Tests

Add a test runner and an `npm test` script. Cover the rubric: gate Unknown, each R1-R7 rule, each
cap, Fail paths, stale drop, sample cap with `uncappedLevel`.

Expected results, today = 2026-11-07, SB 9 with zone, size and fire Pass from fresh official
sources and 3 human tests Unknown: Check 3, Medium, score 1.5. All 6 Pass: Looks good, High, 6.
Fire no data: Check 4, Low, 0. Zoning Unknown: Check 4, Not enough data, 0. Fire Fail: Red flag,
High, -1.5. Fire Fail on a stale layer: Red flag, Medium. All 6 Pass on sample: Looks good, Low.
Sample Fail: Red flag, Low. SB 4 with 3 Pass, 11 Unknown: Check 11, Not enough data. SB 4 with SFHA
Fail: Red flag, High.

## Out of scope

Live data pipeline, recomputing rank, confidence filter or sort, editing `apps/web/src/lib/law-rules.json`.

**Stretch, only if the core is done:** a what-if tick on human tests in the breakdown, labelled
"What-if preview. Nothing is saved or verified."

## Data findings for the live pipeline (checked 2026-11-07)

- SCAG housing-element sites has no Santa Ana rows. Show Unknown, not zero.
- Use the city zoning layer `PBA_ZoningClassifications` first; SCAG 2024 zoning is preliminary.
- APN join: strip hyphens. Condo-style APNs starting with 9 and SCAG `STACK` > 1 are lot size Unknown.
- Fire: use `FHSALRA25_v1_All` (March 2025), not the 2007 and 2011 layers.
- Fault zones: `CGS_Alquist_Priolo_Fault_Zones` is open.
- Flood: NFHL layer 28 has no date; use layer 3 `EFF_DATE`.
- Never request or cache `MailAddress` from the Santa Ana parcel layer. Do not surface
  `HISTORIC_NAME` without checking it.
