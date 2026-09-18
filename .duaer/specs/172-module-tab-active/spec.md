# 172 — Module tab active highlight

## Goal

Active module tab is visually lit (accent border/background); inactive tabs stay muted.

## Acceptance

1. `.module-tab.is-active` uses register accent, not dark `--fg` fallback
2. Inactive tabs are muted; confirmed inactive not brighter than active
