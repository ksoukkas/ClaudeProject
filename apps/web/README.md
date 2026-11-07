# Siteline web app

The web workspace for Siteline. This is the skeleton: layout, routes and shared
components, with placeholders where features will go.

## Try it

You need [Node.js](https://nodejs.org/) 20 or newer. This skeleton was built
and tested with Node 22.15.0.

```bash
cd apps/web
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test:scout` | Offline tests for the scouting agent (parser, ranking, outages) |

Environment variables: copy `.env.example` to `.env.local`. Both are optional:
`ANTHROPIC_API_KEY` turns on Claude parsing and "why call" lines, and
`SCOUT_MODEL` overrides the model (default `claude-opus-5-5`). Without a key
the scout still works with a keyword parser. Never commit `.env.local`.

## Routes

| Route | Purpose | Status |
|---|---|---|
| `/` | Scout: goal prompt (GET to `/results`) and an illustrative sample run | prompt live; step list is a labelled sample |
| `/search` | Redirects to `/` | working |
| `/results?q=...` | Live scout: parsed criteria, ten ranked real sites with sources | **live public data** (falls back to samples with a banner) |
| `/results` (no `q`) | Map + ranked list with working filters | UI from Figma, sample data |
| `/results/live/[id]?q=...` | One live site: every fact with its source, unknowns, pathway leads, score | **live public data** |
| `/results/[id]` | Parcel feasibility report (full report for `olive-commons` only) | UI from Figma, sample data |
| `/results/[id]/memo` | One-page site memo; "Download PDF" opens the print dialog | UI from Figma, sample data |
| `/saved` | Saved-sites pipeline board/list and alert rules | UI from Figma, sample data |
| `/matchmaking` | Landowner and nonprofit developer directory | UI from Figma, sample data |
| `/about` | Sources, assumptions, what is real vs mocked | placeholder |
| `/api/health` | Liveness check, returns JSON | working |
| `/api/scout?q=...` | The scout as JSON: criteria, parser, candidates, sources, warnings, assumptions | **live public data** |

### About the sample data

Every address, owner, organization, listing, document ID and finding in
`src/lib/sample-data.ts` is **fictional** and comes from the Figma designs.
The only real values there are the law source links, copied from
`lanes/1-find-it/data/pathways.json` (checked 2026-11-06). Nothing in the UI
sends anything: "Contact owner", alerts and "Request intro" are mock-ups.

Icons and map art are SVGs exported from Figma into `public/figma/<screen>/`.
Design tokens (colors, fonts) are in `src/app/globals.css`.

## The scouting agent

Lane 1 scenario F02: *"Give me ten sites in one city I should call about this
month, and why each one."* Type a search such as `Anaheim, 40+ affordable
units, near transit`. Code: `src/lib/scout/` (framework-free).

1. **Understand the search.** With `ANTHROPIC_API_KEY` set, Claude
   (`claude-opus-5-5`, or `SCOUT_MODEL`) turns the text into criteria with a
   strict JSON schema: city (one of the 34 OC cities in
   `lanes/2-clear-it/data/oc-cities.json`, else unknown), unit goal,
   affordability, near transit, pathways named, owner type wanted, and notes
   on anything it could not map. Claude only parses intent. Its output is
   sanitized: an unknown city is dropped, and any number that is not in the
   search text is dropped. Without a key, or if the call fails, a keyword
   parser runs. The results page says which parser ran and why.
2. **Find candidates in public data** (one request per layer, cached in memory
   for an hour, 12 s timeout):
   - SCAG housing element sites: every site in the city with APN and
     lower / moderate / above-moderate capacity.
   - The 25 sites with the most counted capacity get two more checks:
     Caltrans HQTA (one multipoint intersect; parcel centroid tested locally;
     only when the search asks for transit) and SCAG zoning (local zoning code
     and acres, one `PID24 IN (...)` query).
3. **Rank, transparently.** Score = up to 50 points for capacity against the
   unit goal + up to 30 for being inside an HQTA with existing service (10 if
   only an MPO-planned stop matches). With a goal, sites that meet it are
   listed first. Every score component is shown with its reason.
4. **Say what is unknown.** Every site is "Needs review", never "Likely
   feasible": a housing element listing is a lead, not a finding. Ownership,
   hazards, utilities, pathway eligibility and whether the site is still
   available are listed as unknown on every site. Pathway leads (SB 9,
   SB 684 / 1123, AB 2011, SB 4) show the condition that would have to be true
   and link to the official source. The SCAG layer has no street address, so
   sites show the APN and "Address unknown".
5. **Why call.** A template sentence built from the facts. With a key, Claude
   drafts the line from the same facts only; a line is rejected (template
   kept) if it has a number that is not in that site's facts, a currency
   sign, or is too long.

### Data sources (checked 2026-11-07 by querying each service)

| Source | Fields read | What we checked |
|---|---|---|
| [SCAG HousingElementSite_poly_scag, layer 0](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0) | `PID24`, `APN24`, `Assessor_Parcel_Number`, `Jurisdiction`, `COUNTY`, `Low_Income_HE_Capacity`, `Moderate_Income_HE_Capacity`, `Above_Moderate_Income_HE_Capacity`, `Total_HE_Capacity`, `YEAR`, `Shape.STArea()` | `COUNTY='Orange'` returns 2,126 sites in 28 jurisdictions, all `YEAR` 2025, no null capacities. Anaheim: 124 sites. Max 2,000 records per request (Garden Grove has 946). |
| [Caltrans CA HQ Transit Areas, layer 0](https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHrailroad/CA_HQ_Transit_Areas/FeatureServer/0) | `hqta_type`, `hqta_details`, `agency_primary` | Multipoint intersect with six Anaheim centroids returned 8 polygons (OCTA major bus stops, an HQ bus corridor, one `mpo_rtp_planned_major_stop`). |
| [SCAG Zoning_poly_OR, layer 0](https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer/0) | `PID24`, `ACRES`, `ZN24_CITY`, `YEAR` | `PID24 IN (...)` for three Anaheim sites returned zones `RM-4`, `C-G`, `T`; dataset `YEAR` 2024. `ZN24_SCAG` is not shown: its legend was not checked. |
| [HCD Sites Inventory](https://hcd.ca.gov/housing-element/sites-inventory) | none (link only) | VERIFIED in `lanes/1-find-it/data/DATA-SOURCES.md` (2026-11-06). Where to confirm a city's adopted inventory. |

Each site links to its exact public record ("View source ↗"). The registry is
`src/lib/scout/sources.ts`.

### ASSUMPTIONs (also shown on the results page)

| ASSUMPTION | Based on |
|---|---|
| Show the top 10 sites | Scenario F02 asks for ten. Not a data limit. |
| Only the 25 highest-capacity sites are checked for transit and zoning | Keeps each search to one small request per service. Lower-capacity sites are not shown. |
| "Affordable" with no income level counts lower-income capacity only | The strictest category in the SCAG layer, so goals are not overstated. "Moderate income" counts lower + moderate; no affordability words counts total capacity. |
| With no unit goal, capacity points max out at 100 units | A round number for ranking, not a policy threshold. |
| Score weights 50 / 30 / 10, goal-meeting sites first | A team choice to make the order explainable, not a measure of feasibility (`src/lib/scout/config.ts`, `rank.ts`). |
| Public-data responses cached for 1 hour | Be kind to public servers. |
| Acres come from SCAG zoning `ACRES`; if missing, from the housing element polygon area (`Shape.STArea()`, m², EPSG:26911) | Labelled on each site. Not an assessor lot size. |

### Live vs. mocked

- **Live:** criteria parsing, the ten ranked sites, capacity, zoning code,
  acres, HQTA test, every source link.
- **Not checked (shown as unknown):** owner and owner type, flood / fire /
  liquefaction / slope, utilities, whether a law's site tests pass, whether
  the site is still listed or for sale. A search for "faith-owned land"
  returns sites but warns that none is confirmed as faith-owned.
- **Still sample data:** the home-page step list (labelled), `/results`
  without a search, `/results/[id]` reports, memos, saved sites, matchmaking.

### Known failure modes

- Seven OC cities have **no sites in the SCAG layer** (checked 2026-11-07):
  Costa Mesa, Huntington Beach, Laguna Woods, Orange, Rancho Santa Margarita,
  Santa Ana, Tustin. The page says so, links HCD, and shows the samples. It
  does not mean those cities have no sites.
- Housing element inventories go stale; a listed site may be built, sold or
  removed. The SCAG zoning data is a 2024 dataset.
- The HQTA test uses the parcel centroid. A large or oddly shaped parcel can
  touch an HQTA while its centroid does not, or the reverse. "Near transit"
  means any HQTA type (bus corridor, major bus or rail stop), not rail only.
- One city per search. With several cities named, the keyword parser keeps
  the longest matching name; with none, the page asks for one.
- If a service times out or errors, the page shows the reason and falls back
  (housing elements) or marks that fact unknown (transit, zoning). Degraded
  results are not cached, so the next search retries.
- The in-memory cache is per server process and resets on restart.

## Layout

```
src/
  app/            Routes (Next.js App Router). One folder per URL segment.
    layout.tsx    Shared shell: header, main, footer
    page.tsx      Landing page
    api/          Route handlers (JSON endpoints)
  components/     React components shared across routes
  lib/            Plain TypeScript: config, types, data access, rules (no React)
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Next and React
versions are exact in `package.json`; `package-lock.json` pins everything else.

## Rules for this repo

See the root `CLAUDE.md` and `docs/ground-rules.md`: no invented numbers or
statutes, label assumptions, cite sources, no personal information, no secrets
in git, prototype only.
