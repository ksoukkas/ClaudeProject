# Feasibility report module

Plain TypeScript, no React. Turns one parcel's facts into a report: a pass /
fail / unknown verdict for every site test under SB 9, SB 684 / SB 1123,
AB 2011 and SB 4, each with the requirement it checks, the source for that
requirement, the data layer used, the value found and who can resolve an
unknown. Plus: disagreements between sources, a law delta, confidence as a
count of resolved tests, a title and CC&R checklist, and next steps.

Rendered at `/report` (list) and `/report/[id]` by
`src/components/feasibility/feasibility-report.tsx`.

## Use it

```ts
import { assessParcel, parcelSource } from "@/lib/feasibility";

const facts = await parcelSource.get("synthetic-001");
if (facts) {
  const report = assessParcel(facts);
  report.coverage; // { totalTests, passed, failed, unknown, ... }
  report.pathways; // one entry per law, each with tests[]
}
```

## Files

| File | What it holds |
|---|---|
| `types.ts` | `ParcelFacts` (input), `FeasibilityReport` (output) and everything between |
| `sources.ts` | Every citable source: URL, VERIFIED / UNVERIFIED, date checked. Taken from the lane's `DATA-SOURCES.md`, `pathways.json` and `docs/background.md` |
| `pathways/*.ts` | One file per law. Each test names its requirement and sources |
| `helpers.ts` | Merging observations, zoning reading, conflict detection, the shared hazard screen |
| `title-check.ts` | Title and CC&R flags, notes and the draft request. Never returns pass |
| `engine.ts` | `assessParcel()`: runs every pathway and assembles the report |
| `fixtures.ts` | Three SYNTHETIC parcels. Every value is made up (ASSUMPTION) |
| `parcel-source.ts` | The seam for real data. Swap `parcelSource` and nothing else changes |

## Plugging in real data

Implement `ParcelSource` in a new file and rebind `parcelSource` in
`parcel-source.ts`. Fill a `ParcelFacts` from the public layers: zoning from
SCAG `Zoning_poly_OR` or the city service, hazards from FEMA / CAL FIRE / county
copies, transit from Caltrans HQTA. Put the layer's id from `sources.ts` on
every observation so the report can cite it. Anything you cannot fill, leave
`null` or `"unknown"`; the report says so.

`categorizeZoningText()` maps a source's zoning text to our categories by
keyword. It is a heuristic (ASSUMPTION); check it against the layer's legend.

## Rules of evidence

- A test is pass, fail or unknown. Never a probability.
- Every requirement names a source. Every verdict names the data it used.
- No number is encoded without a source. Where sources differ (the SB 684 lot
  size), the test returns unknown and says why.
- A proxy (worship-site map, IRS file) is a lead, never a pass.
- Title is never resolved from public data. The section drafts the request a
  user sends themselves. The tool sends nothing.
- Hazard exclusions with statutory mitigation exceptions (SB 9, AB 2011) return
  unknown when a hazard is mapped. SB 4 exclusions follow the HCD summary.

## Adding a test

Add a `makeTest({...})` to the pathway file. Give it a `requirement` in plain
words, `requirementSourceIds` from `sources.ts`, the `dataSourceIds` behind the
value, a `valueFound` string, a `verdict`, a `reason` and a `resolver`. If the
source is not in the registry, add it with its status and the date you checked.
