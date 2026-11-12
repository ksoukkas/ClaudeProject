# Cucumber web app: developer notes

The Next.js app behind Cucumber. For what the project is, its sources, limits and caveats, read
the [root README](../../README.md). This is a prototype, not legal or financial advice.

## Run it

Node.js 20 or newer (built and tested with 22.15.0).

```bash
cd apps/web
npm install
npm run dev     # http://localhost:3000
```

No keys are needed to run it. All datasets are cached in the repo.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Dev server, production build (also type-checks), serve the build. A pre-step copies the MapLibre worker into `public/maplibre/` |
| `npm run lint` | ESLint |
| `npm test` | Offline unit tests, `src/lib/*.test.ts` and `src/lib/search/*.test.ts` (29 passing at last run) |
| `npm run test:scout` | Offline tests for the scout API (parser, ranking, outages) |
| `npm run aerial:batch` | Reads the aerial image of every located tax-defaulted and surplus site with Claude and rewrites `src/lib/search/data/aerial-reads.json`. Needs `ANTHROPIC_API_KEY` in `.env.local`; uses `claude-haiku-5-5` unless `SCOUT_MODEL` is set. Caches each id under `.cache/aerial/` (git-ignored). Calls the model, so it costs money |
| `node scripts/geocode-tax-defaulted.mjs` | Looks up the 108 tax-defaulted parcels in the OC Parcels layer (batched, 2 s pause) and writes `src/lib/search/data/tax-defaulted-geo.json`. Unmatched parcels get nulls |
| `node scripts/fetch-he-sites.mjs` | Re-pulls the SCAG housing-element sites into `public/data/` (two requests) |
| `node scripts/build-surplus-notices-oc.mjs <csv> <oc-cities.json> <out.json>` | Rebuilds the cached Orange County notices subset from an HCD CSV you download first (it never fetches) |

## Environment

Copy `.env.example` to `.env.local`. Both are optional and never committed.

- `ANTHROPIC_API_KEY`: needed only to read the aerial image of a site with no committed read, to
  run `aerial:batch`, and for Claude parsing in `/api/scout`.
- `SCOUT_MODEL`: overrides the Claude model (default `claude-opus-5-5`).

## Routes

| Route | Purpose |
|---|---|
| `/` | The search: one box, filters (source, city, pathway, aerial label), MapLibre map with a street basemap (OpenFreeMap) and a USGS aerial layer, result list, site panel |
| `/search` | Redirects to `/` |
| `/chapter8`, `/chapter8/[apn]` | Chapter 8 scout: the 108 tax-defaulted parcels scored out of 100, with a city dropdown; parcel page with tests and the application checklist |
| `/report`, `/report/[id]` | Law tests per parcel (SB 9, SB 684 / SB 1123, AB 2011, SB 4) and the title and CC&R checklist |
| `/market` | Paste a newer county list; owner and assessee columns are dropped on sight |
| `/about` | Assumptions, what is real, registered sources |
| `GET /api/search` | `q`, `city`, `source`, `pathway`, `aerial`, `limit` (default 50, max 200), `offset`. Returns `total`, `results`, `facets`, `sources`, `warnings`. 400 on a bad `source`, `aerial` or number |
| `GET /api/aerial-read?id=` | One site's AI aerial read. Always 200 with `available` true or false (400 if `id` is missing, 429 over 10 per minute per client, an ASSUMPTION). A committed read is returned first; otherwise it needs a key, fetches the USGS chip, calls Claude and caches under `.cache/aerial/` |
| `GET /api/scout?q=` | Older JSON-only scout over live SCAG, Caltrans and zoning layers. Not used by any page |
| `GET /api/health` | Liveness check |

## Layout

```
src/app/                 Routes and API handlers (Next.js App Router)
src/components/search/   Search UI: search-app, site-map, site-panel, result-card, pathway-pill
src/components/          Shared UI and the Chapter 8 / feasibility components
src/lib/search/          Search backend. types.ts is the contract shared with the UI
  sites.ts               Turns the 3 datasets into SiteResult[] (built once, then memoised)
  index.ts               search(): filters, facets, ordering
  aerial.ts              Image chip + Claude read (server-only). aerial-url.ts is client-safe
  aerial-reads.ts        Committed reads. A missing id means "not read", not "nothing there"
  data/                  aerial-reads.json, tax-defaulted-geo.json (each has a source block)
src/lib/chapter8/        County list, score (score.ts), flags, checklist
src/lib/feasibility/     Law tests, source registry (sources.ts), title check
src/lib/market/          Surplus Land Act notices and pasted-list pipeline
src/lib/scout/           Scout API code
public/data/             SCAG housing-element sites (geojson + meta)
scripts/                 Data scripts listed above
```

## Notes

- The search ids look like `tax-defaulted:<apn>`, `surplus-notice:<id>`, `housing-element:<apn>`.
- SB 4 stays "unknown" for a site because no loaded dataset has ownership. Do not infer it from an
  image.
- An aerial read must always be shown with its caveat (AI reading, unknown capture date, not an
  inspection).
- Never add an address for an improved parcel: most are lived-in homes.
- Rules for this repo are in the root `CLAUDE.md`: no invented numbers or statutes, label
  assumptions, cite sources, no personal information, no secrets in git, prototype only.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MapLibre GL JS.
