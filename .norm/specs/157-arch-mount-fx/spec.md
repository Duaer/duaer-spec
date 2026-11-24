# 157 — Full Archify styles & FX in inline mount

## Goal

Inline (no-iframe) architecture mount must match Archify viewer look:
theme CSS variables, fonts, motion/pulse, node zoom, and real `.focus-chip`
passport — not a stripped SVG + custom card.

## Acceptance

1. Mount includes Archify `.container` + styles scoped to `.archify-root`
2. Archify viewer script runs against the mount (focus-chip + reveal zoom)
3. Desk chrome hides toolbar/header only; keep diagram FX overlays
4. No iframe; height still content-driven
5. L0 tests updated; live desk restarted
