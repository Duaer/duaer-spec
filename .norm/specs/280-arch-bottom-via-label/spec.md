# Feature Specification: Bottom-via edge labels clear mid-row boxes

## Goal

When a same-row edge detours under the floor, its label must stay on the
via (below) — not be pulled up with `labelDy: -36` onto mid-row components
such as `artifact`.

## In scope

- `repairEdgeLabelPlacement` pins `labelAt` under bottom vias / above top vias
- Overlap nudge when an offset mid still hits a box
- Regression for speaker→revise「改稿」 overlapping artifact

## Out of scope

- Changing Archify itself

## Acceptance

1. Reproduced IR renders via Archify
2. `node --test test/live-archify.test.mjs` passes
