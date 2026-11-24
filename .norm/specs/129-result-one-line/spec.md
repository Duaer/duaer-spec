# Feature Specification: Result panel one-line bar

## Intent

The accepted-result block is a single compact bar: heading + optional service
status + actions. No stacked meta / history / duplicate CTAs.

## Acceptance

1. One visual row (wraps only on very narrow widths): title, open, folder, revise
2. Localhost: inline listen/start; static pages: no extra status row
3. Version history chips only when >1 versions, inline in the same bar
4. Cache-bust live static assets so hard-refresh is not required forever
5. `npm run test:live` passes
