# Feature Specification: Settings close click must work

## Goal

The Settings「关闭」button must dismiss the drawer on click.

## Cause

Close was gated on `state.ready` in older builds; `app.js?v=perf-budget-1`
cache kept serving that gate after the logic fix.

## Acceptance

1. Clicking「关闭」hides `#settingsPanel` (with or without model ready).
2. Cache-bust query on `app.js` / `styles.css` so operators get the fix.
3. Tests assert no ready-gate and bumped asset version.
