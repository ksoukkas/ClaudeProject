# `src/lib`

Plain TypeScript with no React or Next.js imports: configuration, shared types,
data access and business rules. Anything here should be testable on its own and
reusable by another client later.

- `config.ts`: site name, tagline and navigation.
- `types.ts`: shared types.
- `scout/`: the scouting agent (query parsing, public-data retrieval,
  ranking, sources registry). Uses the Anthropic SDK only on the server, when
  `ANTHROPIC_API_KEY` is set. Tests: `npm run test:scout`.
