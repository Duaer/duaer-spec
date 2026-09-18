# 145 — Architecture passport stays visible

## Goal

The node passport must not sit under the iframe edge or diagram paint.
Negative left/top (−100px) clipped it; keep left flush and use a 100px
top inset so it stays in the upper-left without being covered.

## Acceptance

1. Embed `.focus-chip` uses positive `left: 0.75rem` and `top: 100px`
2. `z-index` high enough to sit above diagram layers
3. Unit + live smoke pass
