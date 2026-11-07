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
