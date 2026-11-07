# `src/lib`

Plain TypeScript with no React or Next.js imports: configuration, shared types,
data access and business rules. Anything here should be testable on its own and
reusable by another client later.

- `config.ts`: site name, tagline and navigation.
- `types.ts`: shared types.
- `confidence.ts`: pure functions that turn evidence into status and confidence,
  plus the confidence wording. Tests are in `confidence.test.ts`.
- `thresholds.ts`: every cut-off and age limit, each one an ASSUMPTION.
- `law-tests.ts`: the tests for each law and the unscored project conditions.
- `sample-checks.ts`: fictional evidence for the five sample sites.
