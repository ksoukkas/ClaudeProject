# "On the market" module

Plain TypeScript, no React. Answers one question per parcel: is there any
signal that this land is, or is about to be, available? Rendered at `/market`.

## What counts as a signal

| Signal | Where it comes from | Status |
|---|---|---|
| Public notice | HCD Surplus Land Act Notices of Availability, cached Orange County subset in `data/surplus-notices-oc.json` | real public data, public domain |
| Uploaded listing | A CSV the user pastes from their own broker or MLS export | user data, never fetched or verified |

Nothing else. No public source lists private for-sale listings, and the event
rules forbid scraping listing sites, so the flag has no "off market" state.
Absence of a signal reads **"not known to be listed"**.

## Flag states

`public-notice-active` → `uploaded-listing` → `public-notice-archived` → `not-known`,
in that precedence. See `flag.ts`.

## The cached notices

`data/surplus-notices-oc.json` is built from the statewide CSV by
`apps/web/scripts/build-surplus-notices-oc.mjs` and carries its own
`provenance` block: dataset and resource URLs, license, the resource's
last-modified time, the fetch date, row counts, the filter used, the privacy
rule, the columns dropped and the fields derived. To refresh it, download the
CSV from the resource URL in the provenance and run:

```bash
node scripts/build-surplus-notices-oc.mjs <noa_information.csv> ../../lanes/2-clear-it/data/oc-cities.json src/lib/market/data/surplus-notices-oc.json
```

Dropped on purpose: the contact column (staff names, emails, phones) and two
free-text columns. Open the notice on data.ca.gov for contact details. Rows
whose existing use reads as a home (says "occupied", or names a house, home,
dwelling, apartment or residence without saying vacant) have address and
coordinates withheld; `addressWithheld` says so and the count is in the
provenance. The rule is `readsAsHome()` in the script. Confirm it with an
organizer before showing more.

As of the 2026-11-06 file, **all 231 Orange County rows are Archive** and 0
are Active. The page says so. Refreshing the subset is a re-run of the build
script against the current CSV.

## Notices as parcels

`noticeToParcelFacts()` turns a notice into `ParcelFacts` using only what the
notice says: zoning text (categorised by keyword, ASSUMPTION), size, existing
use, vacancy only when the text unambiguously says vacant or occupied (else
unknown; "occupied, no current use" is unknown), and
the disposing agency as a **proxy** public owner, since no deed or Assessor
record was checked. Everything else is unknown, so the feasibility report for a notice is
mostly unknowns with a clear next-steps list. Every notice has a report at
`/report/sla-NNN` through the composite `parcelSource`.

## Files

| File | What it holds |
|---|---|
| `types.ts` | `SurplusNotice`, `UploadedListing`, `MarketSignal`, `OnMarketFlag` |
| `csv.ts` | RFC 4180 parser and `normalizeApn()` (digits only, 6+ digits, free text rejected) |
| `flag.ts` | `computeOnMarketFlag()` |
| `listings.ts` | Parse pasted listings; a SYNTHETIC sample CSV for the demo |
| `notices.ts` | Load, list, match and convert the cached notices |
| `data/surplus-notices-oc.json` | The cached OC subset with provenance |

## Rules of evidence

- A pasted listing is the user's claim, labelled as such; Siteline does not verify it.
- APN matching drops parenthetical notes, splits on `& , ; / +` and the word "and", keeps digit groups of six or more, and matches only when exactly one group remains. Free text with several APNs never matches, so it under-matches rather than over-matches.
- The response window is the notice's own due date, not a number encoded here.
- Nothing is sent to anyone. The page links to the public notice.
