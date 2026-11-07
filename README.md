# Cucumber

> For housing nonprofits across Orange County: every tax-defaulted parcel on the
> county's list, scored out of 100 for a Chapter 8 agreement sale, with the deadline beside the
> score and the public record behind every point.

**Team:** Unlot
**Members:** Felix Hallmann, Laurence Chau, Kevin Sohn, Haven Park, Save Soukkaseum
**Lane:** 1 Find it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026

The event's own README, with the schedule, lanes and submission rules, is at
[docs/event-README.md](docs/event-README.md).

## The real user

A one-person acquisitions team at a small housing nonprofit in Orange County. They
have no GIS staff and lose every bidding war to cash buyers. Tax-defaulted land may be the one
place the law puts them first: as this team understands California's tax-sale law (UNVERIFIED,
Revenue and Taxation Code, Part 6, Chapter 8, cited on the page until read in full), a county may
sell such parcels by agreement to a nonprofit for low-income housing instead of at public auction.
Nobody has turned the county's list into something they can act on.

**Before:** they hear about the county auction after it happens, or scan a PDF of parcel numbers
with no idea which lots could hold homes or which deals could close.
**After:** they open one ranked list of the county's parcels, pick a city, see a score out of 100
with the reason next to every point and "to verify" on every gap, see the deadline beside it, and
open the law tests and the application checklist for the ones worth a call.

## What we built

One list. Every screen says it is a prototype and not legal advice.

1. **Chapter 8 scout** (`/chapter8`, also the home page). Every parcel from the Orange County
   Treasurer-Tax Collector's published tax-defaulted list across all of Orange County:
   108 parcels from Exhibit I for the June 25, 2025 auction, with a city dropdown. Each is scored
   out of 100 on five metrics of 20 points: acquisition certainty, buildability, housing yield,
   funding competitiveness, and cost and complexity. Every point shows its reason. Unknown data
   scores half points and is marked "to verify"; water and sewer is always "verify with the
   utility". Tiers: 75 and up call this week, 55 to 74 worth a look, under 55 watch only. The
   Chapter 8 deadline sits beside the score, never inside it: red under 30 days, orange 30 to 90,
   green 90 and up, and "no deadline on record" for this list, whose auction is over. City dropdown and tier filters.
   Each row links to the parcel detail with the State Controller's ten-step application checklist
   and to the law tests. Street addresses are left out.
2. **Law tests per parcel** (`/report/[id]`). What a tax-defaulted lot could become under SB 9,
   SB 684 / SB 1123, AB 2011 and SB 4: one row per site test with the requirement, the source that
   states it, the data that answered it, and pass / fail / unknown with who can resolve an
   unknown. Disagreements between sources are shown, never resolved silently. A title and CC&R
   checklist that never returns pass and drafts the title request the user sends themselves.
3. **Update list** (`/market`). When the county publishes a newer list, paste it. Owner and
   assessee columns are dropped on sight, homes get their address withheld, and each parcel in the
   county is flagged for where it sits in the process, with the redemption cutoff computed
   as 5 PM the day before the auction (the county's stated rule, read 2026-11-07).
4. **About** (`/about`). What it does, how the score and confidence work, every assumption, what is
   real versus mocked, and all registered sources with VERIFIED / UNVERIFIED status and the date
   checked.

**Demo video:** [link, or "uploaded on the hub"]
**Live demo:** [link, optional]

## How Claude is used

- We built the app with Claude Code, in parallel branches, with a cheap Claude review on every
  push before a human merged (see the pull request history).
- Inside the tool, nothing on the scout list is decided by Claude: every point comes from a rule
  and a record, and every unknown is marked. A housing-element search API (`/api/scout`) kept from
  an earlier cut uses Claude, when an `ANTHROPIC_API_KEY` is set, to parse a goal into criteria;
  it is not on any screen.
- A person verifies the "to verify" lines with the county, the city and a title company, and sends
  any request themselves. The tool sends nothing.

## Try it

You need [Node.js](https://nodejs.org/) 20 or newer (built and tested with 22.15.0) and npm.

```bash
git clone https://github.com/ksoukkas/Cucumber.git
cd Cucumber/apps/web
npm install
npm run dev
```

Open <http://localhost:3000>. It lands on the Chapter 8 scout. Then:

- Filter by city or tier, open **Why this score** on any row, then **Parcel detail** and
  **Law tests with sources**
- `/market` to paste a newer county list, or click **Load SYNTHETIC sample** to see the flags and
  a live deadline badge
- `/about` for the score, the assumptions and every source

Other commands, from `apps/web`: `npm run build` (production build and type check), `npm run lint`,
`npm test` (offline unit tests).

The scout works offline: the county list and the SCAG housing-element sites are cached in the repo.

## Sources and assumptions

| Item | Source or assumption | Date checked |
|---|---|---|
| Tax-defaulted parcels (Chapter 8) | [OC Treasurer-Tax Collector, Exhibit I for Sale #1398](https://www.octreasurer.gov/sites/ttc/files/2025-04/Exhibit%20I%20-%20PUBLIC%20AUCTION%20SALE%20%231398.pdf), the June 25, 2025 auction list; row counts and minimum-bid totals match the exhibit. [Property Auctions page](https://www.octreasurer.gov/taxauction) read in a browser: redemption until 5 PM the day before, list viewable by all | 2026-11-07 |
| Chapter 8 statute (Rev. & Tax. Code 3692.4, 3791.4, Part 6 Chapter 8) | UNVERIFIED: leginfo did not render in automated reads; a FindLaw snippet of 3692.4 quotes "housing directly related to low-income persons". Read in full before relying on it | not fetched |
| Chapter 8 application steps | [State Controller's Chapter 8 sale guide](https://www.sco.ca.gov/Files-ARD-Tax-Info/Tax-Collector-Ref-Man/Chapter8SaleGuide.pdf), ten steps with code sections | 2026-11-07 |
| Housing-element sites (yield bonus) | [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0), 2,126 Orange County sites cached in `apps/web/public/data/`, joined by APN | 2026-11-07 |
| **The 100-point score** | **ASSUMPTION.** The team's ranking convention: five metrics of 20, fixed points per line (for example debt 15%+ of assessed value +8; slope over 10% −4; 20+ units 20; transit within ½ mile +5; value per unit below median +8), unknown at half points marked to verify, tiers at 75 and 55. Encoded in `apps/web/src/lib/chapter8/score.ts`. No statute or program gives these numbers | n/a |
| Score inputs known today | Vacant vs built (county list) and housing-element membership (SCAG). Debt share, hazards, slope, density, transit, grocery, schools, opportunity area, QCT/DDA, Prohousing, value, liens and utilities are not yet joined, so they score half points marked to verify | 2026-11-07 |
| Deadline badge | The county's stated redemption cutoff, 5 PM the day before the auction. Red under 30 days, orange 30 to 90, green 90 and up (ASSUMPTION: the thresholds are the team's) | 2026-11-07 |
| Chapter 8 list staleness | ASSUMPTION: a county list older than 30 days counts as stale, in `apps/web/src/lib/chapter8/flag.ts` | n/a |
| SB 9 (Gov Code 65852.21, 66411.7) | [HCD fact sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf); [HCD SB 9 implementation sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/sb-9-fact-sheet.pdf) | 2026-11-06 |
| SB 684 / SB 1123 (Gov Code 66499.41, 65913.4.5) | [HCD Housing Law Fact Sheets](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf); CalMatters bill pages for [SB 684](https://calmatters.digitaldemocracy.org/bills/ca_202320240sb684) and [SB 1123](https://calmatters.digitaldemocracy.org/bills/ca_202320240sb1123). Lot-size limits differ by source, so that test returns unknown | 2026-11-06 |
| AB 2011 (Gov Code 65912.100 to 65912.140) | [HCD Housing Law Fact Sheets](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf); [HCD draft AB 2011 guidelines](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/draft-ab-2011-guidelines.pdf) | 2026-11-06 |
| SB 4 (Gov Code 65913.16) | [HCD fact sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/aff-hsg-faith-higher-ed-sb-4.pdf) | 2026-11-06 |
| Statute text on leginfo | UNVERIFIED: leginfo returned 403 to automated fetch; links are given for a browser | not fetched |
| Hazards (fire, flood, fault) | FEMA, CAL FIRE and county layers listed in `apps/web/src/lib/feasibility/sources.ts`; registered but not yet queried per parcel | 2026-11-06 |
| Zoning category from text | ASSUMPTION: a keyword mapping of each source's zoning text; the original text is always shown beside it | n/a |
| Next-step ranking in reports | ASSUMPTION: ranked by how many unknowns a step clears, not by cost | n/a |
| Public land offered | [HCD Surplus Land Act Notices of Availability](https://data.ca.gov/dataset/surplus-land-act-notices-of-availability-received), public domain, 231 Orange County rows cached in `apps/web/src/lib/market/data/` with provenance. Kept as data; not on any screen after the Chapter 8 cut | file 2026-11-06, fetched 2026-11-07 |
| Synthetic parcels | ASSUMPTION: three synthetic parcels in `apps/web/src/lib/feasibility/fixtures.ts` show each verdict path; every value is made up | n/a |

Every number we made up is labelled ASSUMPTION here and in the tool.

## What is real and what is mocked

| Part | Status |
|---|---|
| Chapter 8 scout list | real: all 108 parcels across Orange County from the county's June 25, 2025 Exhibit I (44 vacant, 64 with a building), filterable by city; about 16 months old as of 2026-11-07, and the page says parcels may have sold or been redeemed |
| Score out of 100 | working on real inputs where they exist (vacant vs built, housing-element membership); every other line scores half points marked to verify |
| Deadline badge | working; reads "passed" for the loaded list, and red / orange / green for a pasted list with a future auction date |
| City dropdown and tier filters | working, in the URL |
| Parcel detail and application checklist | working; six Chapter 8 tests per parcel through the confidence engine, ten checklist steps from the State Controller's guide |
| Law tests per parcel | working; most hazard and local-code tests return unknown because those layers are not queried per parcel yet |
| Title and CC&R check | partly working: checklist, flags from parcel signals, and a draft request; no public title data exists, so it never returns pass |
| Update list | working on whatever list you paste, with a labelled synthetic sample |
| Housing-element scout API | kept as JSON at `/api/scout` over live SCAG, Caltrans and zoning layers; not on any screen |
| Owner identity, assessed values, hazards, transit, prices | not yet joined; each scores half points marked to verify |

## Where it gets things wrong

- **Most of the score is "to verify" today.** Only two inputs are known per parcel, so every parcel
  lands near the middle and in the watch-only tier. The structure is the product; the joins are
  the roadmap.
- **The loaded list is old.** The June 2025 auction has passed, so the deadline badge reads
  "passed" for every row and any parcel may have sold or been redeemed. Paste the county's next
  list to make the badge live.
- **Unknown dominates the law tests.** On a county parcel, 1 of 22 tests resolves from the list
  alone. That is honest, but it means the report points at what to check rather than answering.
- **Two rule engines exist** (`lib/feasibility` for the law tests, `lib/confidence` plus
  `county-list.ts` for the Chapter 8 tests), written in parallel. Unifying them is on the list.
- **The privacy rule is a heuristic.** Addresses are withheld for anything that reads as a home;
  confirm the rule with an organizer before showing more.
- We would not trust it yet with: a go or no-go on a parcel, any price, or anything about a private
  owner.

## Next steps

For a nonprofit to use this on the next Orange County tax auction: read Revenue and Taxation Code
3692.4, 3791.4 and Chapter 8 in full and replace the UNVERIFIED labels with page citations; join
each parcel by APN to the county parcel layer (lot size), SCAG zoning (density, so yield becomes
real), FEMA and CAL FIRE (buildability), Caltrans transit and the TCAC opportunity map (funding),
and assessed values (debt share and value per unit); ask the Treasurer-Tax Collector for the
county's own Chapter 8 request cutoff and process; and refresh the list when the county publishes
the next one.

With one more week: the parcels on a map from the county's GIS layer; one rule engine behind every
page; grocery, school and utility-service layers; a title-and-lien checklist tuned to tax-sale
risks; and the same score over the Surplus Land Act notices as a second public-land channel.

## Data and privacy

This project uses only public or provided data. It contains no personal information about real
tenants, buyers or residents. The county list is shown by parcel number and city only; street
addresses, default numbers and any owner or assessee columns are left out or dropped on sight,
and anything that reads as a home has its address withheld. The HCD notices' contact column was
dropped before caching. The synthetic parcels are fictional. The tool does not file applications,
send messages, or contact any city or person; it drafts text for a person to review and send.

## License

MIT, see the LICENSE file in this repo.
