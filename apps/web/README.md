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
| `npm test` | Run the confidence tests (Vitest) |

Environment variables: copy `.env.example` to `.env.local`. Nothing reads them
yet. Never commit `.env.local`.

## Routes

| Route | Purpose | Status |
|---|---|---|
| `/` | Scout: goal prompt (GET to `/results`) and a sample scout run | UI from Figma, sample data |
| `/search` | Redirects to `/` | working |
| `/results` | Map + ranked list with working filters | UI from Figma, sample data |
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
