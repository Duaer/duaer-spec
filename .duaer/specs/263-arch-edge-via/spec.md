# Feature Specification: Auto-route architecture edges that cross nodes

## Goal

When Archify rejects architecture IR with `clean-flow/edge-through-node`
(long same-row reverse edges from LLM layout), duaer-live auto-detours those
edges with `fromSide`/`toSide`/`via` so render succeeds.

## In scope

- `routeCrossingEdges` in `bin/live-archify.mjs` (called from layout)
- Unit test using the failing PPT IR (state→gen)
- CHANGELOG / brief note in live-desk if needed

## Out of scope

- Changing Archify itself
- Relayouting all LLM positions from scratch
- Showcase quality profile

## Acceptance

1. Saved IR `state`→`gen` (crosses user/ui/check/doc) renders via Archify without error
2. Neighbor edges without intermediates keep no forced via
3. `npm test` live-archify tests pass
