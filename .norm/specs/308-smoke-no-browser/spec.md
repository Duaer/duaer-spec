# Feature Specification: L3 smoke test must not open a browser

## Symptom

Every `npm test` / `npm run test:live` opened a browser tab on the desk URL.

## Cause

`test/live-smoke.test.mjs` starts `bin/norm-live.mjs` without
`NORM_LIVE_NO_BROWSER`, so the desk calls `open` on start.

## Acceptance

1. The smoke test spawns the desk with `NORM_LIVE_NO_BROWSER=1`.
2. A full `npm test` + `npm run test:live` run triggers no `open` call (macOS unified log) and passes.
