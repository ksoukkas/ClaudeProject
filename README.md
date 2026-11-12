# Cucumber

> One search over three public lists of possible sites for affordable ownership homes in Orange
> County, on a map with aerial imagery, with the source behind every result and "unknown" wherever
> the data is silent.

**Team:** Unlot
**Members:** Felix Hallmann, Laurence Chau, Kevin Sohn, Haven Park, Save Soukkaseum
**Lane:** 1 Find it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026 (finished afterwards)

The event's own README, with the schedule, lanes and submission rules, is at
[docs/event-README.md](docs/event-README.md).

**This is a prototype. It is not legal, financial or lending advice.** It finds leads, not
answers. Check every lead with the county, the city and a professional before acting.

## The real user

Habitat for Humanity Orange County described the problem: finding land for affordable ownership
homes. The person we picture is a one-person acquisitions team at a small housing nonprofit with
no GIS staff, who loses bidding wars to cash buyers and has nobody to read three different public
lists for them. Tax-defaulted land may be the one place the law puts them first: as this team
understands it (UNVERIFIED, Revenue and Taxation Code, Part 6, Chapter 8), a county may sell such
parcels by agreement to a nonprofit for low-income housing instead of at public auction.

**Before:** a PDF of parcel numbers from the county, a state spreadsheet of public land offers,
and a planning map of city sites, each in its own place and none of them showing what is on the
ground.
**After:** one search box and a map. Type a city, a parcel number or a word like "vacant", filter
by list, and see each site with its facts, its source and a look from above.

## Demo

Demo video: docs/demo/cucumber-demo.webm

## What we built

Open the home page (`/`). It searches **2,465 sites** from three real public datasets:

- **108 tax-defaulted parcels** from the OC Treasurer-Tax Collector's Exhibit I
- **231 Surplus Land Act notices** from California HCD (public land that agencies must offer first
  to housing developers)
- **2,126 housing-element sites** from SCAG (sites cities have listed as places for homes)

Results show on a map (street basemap, with a switch to a USGS aerial layer) beside a list. Click
a site for its facts, an aerial image and an AI read of that image. Other pages:

- `/chapter8` the Chapter 8 scout: the 108 county parcels scored out of 100 (see "How it works"),
  with a city dropdown, tiers, the State Controller's application checklist, and a deadline badge
- `/report` and `/report/[id]` what a tax-defaulted lot could become under SB 9, SB 684 / SB 1123,
  AB 2011 and SB 4: one row per test with its source, and pass, fail or unknown
- `/market` paste a newer county list to flag each parcel's place in the process
- `/about` assumptions, what is real, and every registered source

## How Claude is used

- We built the app with Claude Code, in parallel branches, with a Claude review on each push
  before a person merged.
- **AI aerial read.** Claude looked once at a USGS aerial image of each of 312 located
  tax-defaulted and surplus sites (86 and 226) and gave one label plus a sentence. The models
  recorded in `apps/web/src/lib/search/data/aerial-reads.json` are claude-opus-5-5 and
  claude-haiku-5-5. The results are committed, so the app needs no key to show them.
- Nothing else on screen is decided by Claude: scores come from fixed rules and records. A
  separate JSON API (`/api/scout`, not on any page) can use Claude to parse a search when a key is
  set.
- A person checks every lead. The tool sends nothing to anyone.

## Try it

You need [Node.js](https://nodejs.org/) 20 or newer (built and tested with 22.15.0). Open a
terminal and run:

```bash
git clone https://github.com/ksoukkas/Unlot.git
cd Unlot/apps/web && npm install
npm run dev
```

Then open <http://localhost:3000>. No keys are needed. All data is cached in the repo.

Optional: an `ANTHROPIC_API_KEY` in `apps/web/.env.local` (copy `.env.example`) is only needed to
read the aerial image of a site that has no committed read. Never commit that file.
Developer notes are in [apps/web/README.md](apps/web/README.md).

## What is real, what is AI-read, what is unknown

| Part | Status |
|---|---|
| The 3 lists (108 + 231 + 2,126 rows) | Real public data, cached in the repo. The tax-defaulted list is from the June 25, 2025 auction (Exhibit I), so parcels may since have sold or been redeemed |
| Coordinates for tax-defaulted parcels | Real for 86 of 108, found in the OC Parcels layer by parcel number. **22 were not found and have no coordinates**, so they are not on the map |
| Score out of 100 (tax-defaulted only) | A team ranking rule (ASSUMPTION). Only vacant vs built and housing-element membership are known; other lines score half points marked "to verify" |
| AI aerial read | AI reading of an image of **unknown capture date**. 312 sites read once. Not an inspection, and says nothing about ownership, zoning or legality |
| Ownership, SB 4 eligibility | **Unknown** (see limits) |
| Zoning, hazards, utilities, prices, liens | Unknown, not joined |
| Law tests, title and CC&R check | Checklists and tests with sources; most return unknown. Title never returns pass |

## Data sources

| Dataset | Source | Date checked |
|---|---|---|
| Tax-defaulted parcels (108) | [OC Treasurer-Tax Collector, Exhibit I for Sale #1398](https://www.octreasurer.gov/sites/ttc/files/2025-04/Exhibit%20I%20-%20PUBLIC%20AUCTION%20SALE%20%231398.pdf); [Property Auctions page](https://octreasurer.gov/taxauction) (redemption until 5 PM the day before an auction). Row counts and minimum-bid totals match the exhibit | 2026-11-07 |
| Coordinates and acres for those parcels | [OC Public Works Parcels FeatureServer](https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/FeatureServer/0), 86 of 108 found. Acres are computed from geometry, not an official lot size. Addresses kept only for vacant parcels | 2026-11-12 |
| Surplus Land Act notices (231 Orange County rows) | [HCD Notices of Availability on data.ca.gov](https://data.ca.gov/dataset/surplus-land-act-notices-of-availability-received), "Other (Public Domain)" as stated there. Contact column dropped | fetched 2026-11-07 (file modified 2026-11-06) |
| Housing-element sites (2,126) | [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0). No Santa Ana records exist in this layer. Points are polygon centroids | 2026-11-07 |
| Aerial imagery | [USGS National Map NAIP ImageServer](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer), public domain, credit USGS and USDA ([USGS copyright page](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)). Capture date at a point not read | 2026-11-12 |
| Street basemap | [OpenFreeMap](https://openfreemap.org/) "positron" style with OpenStreetMap data, attribution on the map. Terms not checked by us | not checked |
| Chapter 8 application steps | [State Controller's Chapter 8 sale guide](https://www.sco.ca.gov/Files-ARD-Tax-Info/Tax-Collector-Ref-Man/Chapter8SaleGuide.pdf) (updated 12/2018 per the guide) | 2026-11-07 |
| Chapter 8 statute (Rev. & Tax. Code 3692.4, 3791.4, Part 6 Chapter 8) | UNVERIFIED: leginfo did not render in automated reads. Read in full before relying on it | not fetched |
| SB 9, SB 684 / SB 1123, AB 2011, SB 4 | [HCD Housing Law Fact Sheets](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf) and the other HCD pages registered in `apps/web/src/lib/feasibility/sources.ts` and listed on `/about`. Statute text on leginfo is UNVERIFIED | 2026-11-06 |

## How the search works

- The three datasets are turned into one list of sites. A field a source does not give stays
  empty, never filled in.
- Free text matches parcel number (with or without dashes), city, address, use, source, pathway
  names and the AI aerial label. Every word you type must match.
- Filters: source list, city, pathway and aerial label. Counts beside each filter come from the
  current result set. The search is also in the web address, so a view can be shared.
- Order: tax-defaulted parcels by score, then Surplus Land Act notices, then housing-element
  sites (largest planned capacity first).
- Tax-defaulted parcels get a score out of 100: five metrics of 20 (acquisition certainty,
  buildability, housing yield, funding competitiveness, cost and complexity). Unknown data scores
  half points and says "to verify". The tiers (75, 55) and the points are an **ASSUMPTION**: the
  team's ranking convention, in `apps/web/src/lib/chapter8/score.ts`. No law or program sets them.
  The deadline sits beside the score, never in it.
- The AI aerial read is a label (vacant lot, parking lot, building looks intact, building possibly
  distressed, unclear) from a 150 m image chip (ASSUMPTION: a size chosen to show a lot and its
  neighbours). It is shown with its caveat every time.

## Where it gets things wrong

- **SB 4 is "unknown" for every site.** The law concerns land owned by faith or higher-education
  institutions. No loaded dataset says who owns a parcel, and an aerial image cannot show
  ownership. We do not guess.
- **The list is old.** The tax-defaulted list is from the June 25, 2025 auction. Its deadline
  badge reads "passed", and any parcel may have been sold or redeemed.
- **The AI read can be wrong and the image can be old.** Capture date is unknown. Of the 312
  reads: vacant lot 154, building looks intact 70, unclear 53, parking lot 30, building possibly
  distressed 5. The read is also missing for 22 tax-defaulted parcels (no coordinates) and 5
  notices (no coordinates), and for all 2,126 housing-element sites (not read).
- **Two sources disagree on some tax-defaulted parcels.** The county flags 44 as vacant land and 64
  as improved. The AI read called 11 of the 44 vacant ones a building and 3 of the 64 improved ones
  a vacant lot. We show both and do not say which is right; check the county record and a site
  visit.
- **Most of the score is "to verify".** Only two inputs are known per parcel, so scores cluster in
  the middle. The structure is the product; the joins are the roadmap.
- **A housing-element listing is a planning listing, not an approval.** Inventories go stale.
- **Law tests are mostly unknown.** Hazard and local-code layers are not queried per parcel.
- **The privacy rule is a heuristic.** Addresses are withheld for anything that reads as a home.
- We would not trust it with: a go or no-go on a parcel, any price, or anything about a private
  owner.

## Path to the next 100 projects

What it would take for a nonprofit to use this next month: read Revenue and Taxation Code Part 6
Chapter 8 in full and replace the UNVERIFIED labels with page citations; ask the Treasurer-Tax
Collector for the county's own Chapter 8 request process; load the county's newest list in
`/market`; then join each parcel by APN to ownership and assessed values (what would let SB 4 and
the score's debt lines stop being unknown), zoning, hazards and transit. The same pattern (a
cached public list, a source on every row, an AI look that is labelled) can repeat for each
county that publishes a tax-defaulted list and for each city's housing-element inventory. That is
a path we believe is plausible; we have not tested it outside Orange County.

## Data and privacy

This project uses only public or provided data. It contains no personal information about real
tenants, buyers or residents. The county list is shown by parcel number and city; tax default
numbers and any owner or assessee columns are not kept, and addresses are kept only for vacant
parcels (16 have one). The HCD notices' contact column was dropped before caching. The synthetic
parcels and sample paste list are fictional. The tool does not file applications, send messages,
or contact any city or person.

## License

MIT, see the LICENSE file in this repo.
