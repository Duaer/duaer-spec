# Feature Specification: Make chat quick-nav visible

## Goal

The chat-edge「导航」control must stay fully visible (not clipped by
`overflow: hidden` or covered by the middle column).

## Acceptance

1. Quick-nav button sits inside the chat panel right edge (no outward half-clip).
2. Menu opens inward over the chat log so it is not clipped.
3. Button z-index clears the chat log / composer stacking.
4. L0 + smoke marker; stamp delivery.

## Out of scope

- Changing nav targets or timeline behavior
