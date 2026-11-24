# Feature Specification: Architecture corridor detour for clean-flow

## Goal

When Archify rejects edges that cross unrelated components, auto-routing
must pick a corridor whose segments stay clear of other boxes — not a
naive bottom exit through column neighbors, and not a side via whose
horizontal leg clips co-row nodes. Vertical edge labels must sit in the
gap between stacked boxes.

## In scope

- `routeCrossingEdges` validates candidate routes (bottom/top wrap, side
  corridor, gutter wrap) and applies the first clear detour
- Re-route edges that already have a bad bottom via
- Vertical edge labels get `labelAt` in the inter-box gap
- Regression test matching the speaker/editor/store failure

## Out of scope

- Changing Archify itself
- Full force-directed relayout

## Acceptance

1. The reproduced IR (speaker→editor, store→gen, 初稿/定稿 labels) renders
2. Existing same-row reverse-edge test still passes
3. `npm test` live-archify tests pass
