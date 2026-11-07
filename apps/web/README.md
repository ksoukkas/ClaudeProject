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
| `/` | Landing page | placeholder |
| `/search` | Search form (plain GET form to `/results`) | placeholder |
| `/results` | Ranked list | placeholder |
| `/results/[id]` | Detail view for one result | placeholder |
| `/about` | Sources, assumptions, what is real vs mocked | placeholder |
| `/api/health` | Liveness check, returns JSON | working |

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
