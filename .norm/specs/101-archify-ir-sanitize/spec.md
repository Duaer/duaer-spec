# Brief: Sanitize Archify IR before render

## Goal

Architecture render must succeed when the model JSON mixes chat/Brief
fields (`type`, `reply`, `goal`, `outOfScope`, …) with Archify IR.

## In scope

- Strip unknown top-level and nested properties before Archify `deliver`
- Keep extract + normalize shared behavior for server and browser
- Regression test for contaminated IR payloads

## Out of scope

- Changing Archify itself or diagram visual style

## Acceptance

1. Contaminated IR (extra `goal`/`reply`/…) renders without schema error
2. Clean IR still renders
3. `npm test` and `npm run test:live` pass for live-archify coverage
