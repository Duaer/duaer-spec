# 146 — Passport offset 100px without clipping

## Goal

Move the node passport 100px toward the upper-left relative to the
diagram without negative insets that clip under the iframe edge.

## Approach

Pad `.diagram-container` 100px top/left; keep `.focus-chip` at a positive
inset inside that gutter with high z-index.

## Acceptance

1. Embed CSS has padding-top/left 100px on diagram-container
2. focus-chip left/top stay positive (0.75rem) with z-index 10000
3. Unit + live smoke pass
