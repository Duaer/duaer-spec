# Feature Specification: Lock confirm-workers after dispatch graph

## Goal

After the operator confirms worker count and the dispatch graph builds
successfully, **确认人数并生成派工图** stays locked so it cannot be
re-clicked. Worker-count chips lock with it. Unlock only when the graph
becomes stale (count/decompose/architecture invalidate).

## In scope

- Keep confirm button disabled + locked label when `dispatchGraphReady`
- Lock worker-count chips while the graph is ready
- Re-enable when the graph is marked stale or cleared
- i18n + desk docs + E2E catalog + regression markers

## Out of scope

- Changing how the graph is generated
- Locking「查看派工图」

## Acceptance

1. After a successful confirm+build, the confirm button is disabled and shows a locked label.
2. Changing architecture / re-decompose / clearing ready unlocks the button again.
3. `node --test test/task-graph.test.mjs` and live i18n key parity pass.
