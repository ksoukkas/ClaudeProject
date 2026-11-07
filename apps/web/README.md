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
| `npm test` | Unit tests for filters and confidence (`node:test` via `tsx`) |
| `node scripts/fetch-he-sites.mjs` | Re-pull the cached public Housing Element sites (one small query) |

Environment variables: copy `.env.example` to `.env.local`. Nothing reads them
yet. Never commit `.env.local`.

## Routes

| Route | Purpose | Status |
|---|---|---|
| `/` | Scout: goal prompt (GET to `/results`) and a sample scout run | UI from Figma, sample data |
| `/search` | Redirects to `/` | working |
| `/results` | Interactive map + ranked list, filters in the URL | working, sample data + one public layer |
| `/results/[id]` | Parcel feasibility report (full report for `olive-commons` only) | UI from Figma, sample data |
| `/results/[id]/memo` | One-page site memo; "Download PDF" opens the print dialog | UI from Figma, sample data |
| `/saved` | Saved-sites pipeline board/list and alert rules | UI from Figma, sample data |
| `/matchmaking` | Landowner and nonprofit developer directory | UI from Figma, sample data |
| `/about` | How confidence works, assumptions, what is real vs mocked | confidence rule and status table built; sources list is a placeholder |
| `/api/health` | Liveness check, returns JSON | working |

### About the sample data

Every address, owner, organization, listing, document ID and finding in
`src/lib/sample-data.ts` is **fictional** and comes from the Figma designs.
The only real values there are the law source links, copied from
`lanes/1-find-it/data/pathways.json` (checked 2026-11-06). Nothing in the UI
sends anything: "Contact owner", alerts and "Request intro" are mock-ups.

Icons and map art are SVGs exported from Figma into `public/figma/<screen>/`.
Design tokens (colors, fonts) are in `src/app/globals.css`.

## Honest confidence

Confidence is computed from evidence in `src/lib/confidence.ts`. It is never
typed in. It means "how much can you trust this answer", not "how good is this
site", so a site can be a Red flag with High confidence.

- Each law has its tests in `src/lib/law-tests.ts`: Pass, Fail or Unknown. A test
  with no data is Unknown, never Pass.
- With a Fail, confidence is graded on the Fail's own evidence.
- With no Fail, an open gate test gives Not enough data. Otherwise: nothing
  unknown gives High, 75% of public tests answered gives Medium, 1/3 gives Low,
  and less gives Not enough data.
- Caps: sample data caps at Low, a secondary source or a law flagged for
  verification caps at Medium, and a stale source drops one step.

**ASSUMPTION:** every cut-off and age limit is a working choice, not law. They
all live in `src/lib/thresholds.ts`, and `/about` shows them. Today's five sites
are fictional, so none can rate above Low. Live data plugs in by passing real
`RawCheck` records to `computeConfidence`. Rank is still the typed sample order.

## Map and filters (`/results`)

**Map.** `src/components/parcel-map/` uses [MapLibre GL JS](https://maplibre.org/)
with the no-key [OpenFreeMap](https://openfreemap.org/) "positron" style.
Attribution (OpenFreeMap · OpenMapTiles · OpenStreetMap) stays on the map. It
only renders in the browser (`dynamic(..., { ssr: false })`). Pins are numbered
like the ranked list. Clicking a pin selects its card and vice versa, and
filtered-out sites are dimmed, not removed. The Scout page still uses the
static illustrative `OcMap`.

**Two layers, each with its own toggle and look** (top-left of the map; both
on by default):

- *Sample sites*: the five fictional parcels as numbered, colored pins. Their
  positions are **illustrative** points near each city's centre, not real
  lots. Only these have a feasibility screen and a report.
- *Public Housing Element sites*: **all 2,126 Orange County sites** in
  [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0)
  (28 cities plus unincorporated county land), pulled on 2026-11-07 by
  `scripts/fetch-he-sites.mjs` (2 pages of 2,000, capped at 3) into
  `public/data/he-sites.geojson` (about 620 KB) and `he-sites.meta.json`.
  Shown as grey clusters; click a cluster to zoom in, click a dot for its
  APN, planned homes by income level and year. Points are polygon
  centroids. **Santa Ana has no records in this source.** No feasibility,
  law or ownership verdict is attached to them.

**The map follows the search.** Whenever the cities change (from the search
text or the City filter) it zooms to fit every site in those cities, or the
whole county when no city is chosen.

**Public sites are colored by planned homes vs your unit goal** (green: meets
it, grey: fewer, light grey: unknown). These are deliberately not the
feasibility colors, because public sites have no feasibility screen. The top
10 by planned homes get numbered square pins, matching the numbers in the list.

The **Public Housing Element sites** list under the ranked sample sites shows
the same records, largest planned capacity first. Clicking a row flies the
map to the site and opens its popup, and clicking a dot highlights its row.
Only the city filter applies to public sites (the source has no law, owner,
lot size, listing or feasibility data); the city filter lists every city in
either layer.

**Filters live in the URL**, so a view can be shared:
`q`, `city` (repeatable), `law`, `owner`, `minAcres`, `maxAcres`, `goal`,
`market=on`, `status`, `sort`. Precedence is explicit param, then what the
search text says, then the default. The logic is plain TypeScript in
`src/lib/filters.ts`, with tests in `src/lib/filters.test.ts`.

The search text is read for city names, bill numbers ("SB 9", "AB 2011",
"SB 684 / 1123", "SB 4" set the law filter), "faith"/"church", "commercial",
"small"/"infill" and a unit goal like "40+". Bill numbers and bare years are
never read as a unit goal. What was understood shows as
removable chips. Words it can't use (e.g. "near transit") are listed as "Not
used", never dropped silently.

**Assumptions** (also marked `ASSUMPTION` in the code and UI):

- The default unit goal is **40**, taken from the Scout example query. It only
  labels sites (meets / may meet / below goal); it never hides them.
- "Small" or "infill" in a query means a lot of **0.5 acres or less**. This is
  a round number for the demo, not from any statute.
- The law filter matches each sample site's assigned pathway. It is not an
  eligibility screen.

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
