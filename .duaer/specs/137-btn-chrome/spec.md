# 137 — Restore complete button chrome

## Goal

Desk buttons show full intended styles (not bare / misaligned / wrongly visible when hidden).

## Acceptance

1. `.btn` has flex centering + appearance reset; `[hidden]` stays display:none
2. Preview-bar, revise-cta, architecture-actions keep compact aligned chrome
3. Cache bust; L3 smoke passes
