# Siteline

> For small nonprofits, congregations and city housing staff in Orange County: find land where
> affordable housing could legally go, and see exactly which public record says so.

**Team:** Unlot
**Members:** Felix Hallmann, Laurence Chau, Kevin Sohn, Haven Park, Save Soukkaseum
**Lane:** 1 Find it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026

The event's own README, with the schedule, lanes and submission rules, is at
[docs/event-README.md](docs/event-README.md).

## The real user

A one-person acquisitions team at a small housing nonprofit. They have no GIS staff. Sites reach
them by luck: a city calls about surplus land, or a congregation offers a parking lot. California
has opened land under SB 9, SB 684 / SB 1123, AB 2011 and SB 4, but nobody has joined those laws to
the parcel data in a way they can use.

**Before:** they read the websites of the county's 34 incorporated cities
(`lanes/2-clear-it/data/oc-cities.json`), call planning counters one at a time, and still cannot
tell a legal site from a usable one.
**After:** they type a city and a goal, get ranked sites from public data, and open a report that
shows every test, the record behind it, and what is still unknown, with a drafted next step.

## What we built

A web workspace with five parts. Every screen says it is a prototype and not legal advice.

1. **Scout** (arrives with [pull request 7](https://github.com/ksoukkas/Unlot/pull/7), not yet
   merged at the time of writing). Type a goal such as "Anaheim, 40+ affordable units, near
   transit". The agent will pull adopted housing-element sites for the city from SCAG, join
   Caltrans transit areas and SCAG zoning, and rank candidates with the sources it used, from
   live public data, cached and throttled. On `main` today, `/results` filters sample parcels and
   the real housing-element points.
2. **Feasibility report** (`/report/[id]`). One row per site test under each law: the requirement,
   the source that states it, the data layer that answered it, the value found, and a
   pass / fail / unknown verdict with who can resolve an unknown. Disagreements between sources
   are shown, never resolved silently. A title and CC&R checklist that never returns pass and
   drafts the request the user sends themselves.
3. **Chapter 8 pipeline** (`/market`). The niche: tax-defaulted parcels in Santa Ana, Stanton and
   Anaheim that a nonprofit may acquire by agreement before the county's tax auction, under the
   Revenue and Taxation Code's Chapter 8 sales (sections cited on the page as unverified until
   read in full). Paste the Treasurer-Tax Collector's auction list and each parcel gets a flag:
   request window open, power to sell but not scheduled, auction passed, or redeemed. The
   county's own facts (last auction June 25, 2025; redemption until 5 PM the day before) are
   shown with the date read. Real Surplus Land Act notices stay as a second public-land channel.
   Owner and assessee columns are dropped on sight; homes get their address withheld.
4. **Honest confidence.** Confidence is how much the evidence can be trusted, not how good the
   site is. For a Chapter 8 parcel: how many facts the county list answers and how fresh the
   list is, since owners can redeem until the day before an auction. The staleness limit is
   labelled ASSUMPTION. For the law tests, coverage and source freshness as before, with every
   threshold labelled on `/about`.
5. **Filters and map.** City and status filters over the Chapter 8 list for the three focus
   cities; the Results page keeps its city, law, owner, acreage and status filters over an
   interactive map of the real housing-element points. Putting the tax-defaulted parcels on the
   map is the next step: the county publishes a GIS map of them.

**Demo video:** [link, or "uploaded on the hub"]
**Live demo:** [link, optional]

## How Claude is used

- We built the app with Claude Code, in parallel branches, with a cheap Claude review on every
  push before a human merged (see the pull request history).
- Inside the tool, the scout in [pull request 7](https://github.com/ksoukkas/Unlot/pull/7) (not
  yet merged at the time of writing) uses Claude, when an `ANTHROPIC_API_KEY` is set, to turn the
  search text into explicit criteria and to draft the one-line "why call" for each candidate.
  Both are labelled as drafted by Claude and shown next to the facts they came from. Without a
  key, a keyword parser runs instead. Nothing on `main` reads the key until that PR merges.
  Claude never decides a verdict: every pass, fail or unknown comes from a rule and a record.
- A person checks the sources, confirms unknowns with the city or a title company, and sends any
  outreach themselves. The tool sends nothing.

## Try it

You need [Node.js](https://nodejs.org/) 20 or newer (built and tested with 22.15.0) and npm.

```bash
git clone https://github.com/ksoukkas/Unlot.git
cd Unlot/apps/web
npm install
npm run dev
```

Open <http://localhost:3000>. Then:

- `/results?q=Anaheim, 40+ affordable units, near transit` for the filtered list and map (sample
  parcels plus real housing-element points; the live scout arrives with pull request 7)
- `/report` for the feasibility reports (three synthetic parcels, then real public-land notices)
- `/market` for the Chapter 8 pipeline (paste the county list or load the synthetic sample) and the
  Surplus Land Act notices
- `/about` for how confidence works and what is real versus mocked

Optional, once pull request 7 is merged: copy `apps/web/.env.example` to `apps/web/.env.local` and
set `ANTHROPIC_API_KEY` to turn on Claude parsing in the scout. The app runs without it, and
nothing on `main` reads the key today. Never commit `.env.local`.

Other commands, from `apps/web`: `npm run build` (production build and type check), `npm run lint`,
`npm test` (offline unit tests).

The app needs the internet for live public layers. Cached copies of the two datasets we ship are
in the repo so the report and market pages work offline.

## Sources and assumptions

| Item | Source or assumption | Date checked |
|---|---|---|
| SB 9 (Gov Code 65852.21, 66411.7) | [HCD fact sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf); [HCD SB 9 implementation sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/sb-9-fact-sheet.pdf) | 2026-11-06 |
| SB 684 / SB 1123 (Gov Code 66499.41, 65913.4.5) | [HCD Housing Law Fact Sheets](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf); CalMatters bill pages for [SB 684](https://calmatters.digitaldemocracy.org/bills/ca_202320240sb684) and [SB 1123](https://calmatters.digitaldemocracy.org/bills/ca_202320240sb1123) | 2026-11-06 |
| AB 2011 (Gov Code 65912.100 to 65912.140) | [HCD Housing Law Fact Sheets](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/housing-law-fact-sheets.pdf); [HCD draft AB 2011 guidelines](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/draft-ab-2011-guidelines.pdf) | 2026-11-06 |
| SB 4 (Gov Code 65913.16) | [HCD fact sheet](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/aff-hsg-faith-higher-ed-sb-4.pdf) | 2026-11-06 |
| Statute text on leginfo | UNVERIFIED: leginfo returned 403 to automated fetch; links are given for a browser | not fetched |
| Numeric limits per law (lot sizes, unit caps) | `apps/web/src/lib/law-rules.json`, from an [OC Public Works SB 9 handout](https://pwds.oc.gov/sites/ocpwocds/files/2026-04/SB%209%20Guidance%20Handout%2003.31.2026.pdf) and secondary planning pages. Summaries, not the statute | 2026-11-07 |
| SB 684 / SB 1123 lot-size limit | **Sources disagree.** The lane's `pathways.json` says limits differ by source and bill, so the feasibility report returns unknown; `law-rules.json` encodes a limit from a county planning page. Both are shown; confirm against Gov Code 66499.41 | 2026-11-06 / 2026-11-07 |
| Housing-element sites | [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0), 2,126 Orange County sites, cached in `apps/web/public/data/` | 2026-11-07 |
| Transit | [Caltrans CA High Quality Transit Areas](https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHrailroad/CA_HQ_Transit_Areas/FeatureServer/0) | 2026-11-06 |
| Zoning | [SCAG Zoning_poly_OR](https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer) and city text where given | 2026-11-06 |
| Tax-defaulted parcels (Chapter 8) | [OC Treasurer-Tax Collector: Property Auctions](https://www.octreasurer.gov/taxauction) and [Published Notices](https://www.octreasurer.gov/PublishedNotices). Read in a browser: last auction June 25, 2025, Board approval March 11, 2025, redemption until 5 PM the day before, list viewable by all and downloadable by registered users. The list is pasted by the user, not cached | 2026-11-07 |
| Chapter 8 statute (Rev. & Tax. Code 3692.4, 3791.4, Part 6 Chapter 8) | UNVERIFIED: leginfo did not render in automated reads; a FindLaw snippet of 3692.4 quotes "housing directly related to low-income persons". Read in full before relying on it | not fetched |
| Chapter 8 list staleness | ASSUMPTION: a county list older than 30 days counts as stale, in `apps/web/src/lib/chapter8/flag.ts` | n/a |
| Public land offered | [HCD Surplus Land Act Notices of Availability](https://data.ca.gov/dataset/surplus-land-act-notices-of-availability-received), public domain, 231 Orange County rows cached in `apps/web/src/lib/market/data/` with provenance; 138 shown for the focus cities | file 2026-11-06, fetched 2026-11-07 |
| Hazards (fire, flood, fault) | FEMA, CAL FIRE and county layers listed in `apps/web/src/lib/feasibility/sources.ts`; registered but not yet queried per parcel, so hazard tests read unknown | 2026-11-06 |
| Confidence thresholds | ASSUMPTION: coverage shares, borderline percent, sliver percent and source age limits in `apps/web/src/lib/thresholds.ts`, explained on `/about` | n/a |
| Zoning category from text | ASSUMPTION: a keyword mapping of each source's zoning text; the original text is always shown beside it | n/a |
| Next-step ranking | ASSUMPTION: ranked by how many unknowns a step clears, not by cost | n/a |
| Unit goal default of 40, "small site" of half an acre, scout throttle (the throttle is in pull request 7, not yet on `main`) | ASSUMPTION: demo defaults, labelled in code and UI | n/a |
| Synthetic parcels and the sample workspace | ASSUMPTION: three synthetic parcels in `apps/web/src/lib/feasibility/fixtures.ts` and the Figma sample workspace (organization, owners, saved sites, directory) are fictional; every value is made up | n/a |

Every number we made up is labelled ASSUMPTION here and in the tool.

## What is real and what is mocked

| Part | Status |
|---|---|
| Scout search over live SCAG, Caltrans and zoning layers | in pull request 7, not yet merged: live public data with a labelled sample fallback. On `main` today, `/results` filters sample parcels and real housing-element points |
| Claude parsing of the goal and "why call" lines | in pull request 7, not yet merged: works with an API key, keyword parser without. Nothing on `main` calls Claude today |
| Feasibility report: state-law tests with sources and verdicts | working; most hazard and local-code tests return unknown because those layers are not queried per parcel yet |
| Feasibility report: local zoning plain-English translation | mocked: the slot exists, no city code text is wired |
| Title and CC&R check | partly working: checklist, flags from parcel signals, and a draft request; no title data exists in public sources, so it never returns pass |
| Chapter 8 pipeline: county tax-defaulted list | user-pasted only, with a labelled synthetic sample; no real list is cached yet. Flags and evidence levels work on whatever is pasted |
| Chapter 8 pipeline: Surplus Land Act notices (second channel) | working on real data; 0 of the 138 focus-city notices were active on 2026-11-06, and the page says so |
| Honest confidence | working; sample-data sites are capped at Low because their documents are fictional |
| Map and filters | working: filters over the sample parcels and the real housing-element points |
| Saved sites, matchmaking directory, site memo | mocked: Figma screens over fictional sample data |
| Owner identity, listing prices, Assessor roll | not available in any free public source; shown as unknown |

## Where it gets things wrong

- **Housing-element sites are not the same as law-eligible parcels.** They are a city's own
  inventory. The scout in pull request 7 uses them as a starting universe once it merges; the
  countywide parcel layer is the next step.
- **The zoning keyword mapping is crude.** "Open Space with Commercial Option" reads as
  commercial. The original text is always shown so a person can override it.
- **Unknown dominates.** On the first real public-land notice we opened (`/report/sla-001`),
  4 of 22 tests resolved. That is honest, but it means the tool points at what to check rather
  than answering.
- **Two rule engines exist today** (`lib/feasibility` and `lib/law-tests`), written in parallel.
  They agree on the laws but not on every test list or number, so the same parcel can read
  differently on different pages. Unifying them is the first item below.
- **The privacy rule is a heuristic.** Five notices whose existing use reads as a home have their
  address withheld; confirm the rule with an organizer before showing more.
- We would not trust it yet with: a go or no-go on a site, any price, or anything about a private
  owner.

## Next steps

For a nonprofit or city to use this next month: one rule engine behind every page; the countywide
parcel layer as the search universe with cached, throttled queries; hazard layers queried per
parcel; one city's zoning code text wired into the plain-English slot; and a second data check by
a planner.

With one more week: an acquisition-fit score beside confidence (owner reachable, buildable,
nonprofit-first, price) with each part sourced or unknown; a weekly re-run that shows what is new;
the congregation flow ("could our land become homes?") on mobile; and an Assessor-roll request
for owner type so SB 4 stops relying on proxies.

## Data and privacy

This project uses only public or provided data. It contains no personal information about real
tenants, buyers or residents. The HCD notices' contact column (staff names, emails, phones) was
dropped before caching, and notices that read as an occupied home have their address and
coordinates withheld. The sample workspace, owners, listings and saved sites are fictional. The
tool does not file applications, send messages, or contact any city or person; it drafts text for a
person to review and send.

## License

MIT, see the LICENSE file in this repo.
