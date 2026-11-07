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
| `npm test` | Unit tests for the filter logic (`node:test` via `tsx`) |
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
| `/about` | Sources, assumptions, what is real vs mocked | placeholder |
| `/api/health` | Liveness check, returns JSON | working |

### About the sample data

Every address, owner, organization, listing, document ID and finding in
`src/lib/sample-data.ts` is **fictional** and comes from the Figma designs.
The only real values there are the law source links, copied from
`lanes/1-find-it/data/pathways.json` (checked 2026-11-06). Nothing in the UI
sends anything: "Contact owner", alerts and "Request intro" are mock-ups.

Icons and map art are SVGs exported from Figma into `public/figma/<screen>/`.
Design tokens (colors, fonts) are in `src/app/globals.css`.

## Map and filters (`/results`)

**Map.** `src/components/parcel-map/` uses [MapLibre GL JS](https://maplibre.org/)
with the no-key [OpenFreeMap](https://openfreemap.org/) "positron" style.
Attribution (OpenFreeMap · OpenMapTiles · OpenStreetMap) stays on the map. It
only renders in the browser (`dynamic(..., { ssr: false })`). Pins are numbered
like the ranked list. Clicking a pin selects its card and vice versa, and
filtered-out sites are dimmed, not removed. The Scout page still uses the
static illustrative `OcMap`.

**Two layers, never mixed** (toggle at the top-left of the map):

- *Sample sites*: the five fictional parcels. Their positions are
  **illustrative** points near each city's centre, not real lots.
- *Public data: Housing Element sites*: a cached copy of
  [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0)
  for Anaheim and Santa Ana, pulled once on 2026-11-07 by
  `scripts/fetch-he-sites.mjs` into `public/data/he-sites.geojson` (with
  `he-sites.meta.json`). That returned 124 Anaheim sites and **0 Santa Ana
  sites**. Points are polygon centroids. No feasibility, law or ownership
  verdict is attached to them; the popup shows only fields in the source.

**Filters live in the URL**, so a view can be shared:
`q`, `city` (repeatable), `law`, `owner`, `minAcres`, `maxAcres`, `goal`,
`market=on`, `status`, `sort`. Precedence is explicit param, then what the
search text says, then the default. The logic is plain TypeScript in
`src/lib/filters.ts`, with tests in `src/lib/filters.test.ts`.

The search text is read for city names, "faith"/"church", "commercial",
"small"/"infill" and a unit goal like "40+". What was understood shows as
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
