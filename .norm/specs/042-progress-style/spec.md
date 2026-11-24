# Feature Specification: Progress panel desk-plate restyle

**Feature Branch**: `fix/progress-style`

**Created**: 2026-09-16

**Status**: Active

## Goal

Restyle the live desk progress line / progress panel (e.g. `0/3 · 进行中：T001 …`)
so it matches the live desk **plate** aesthetic — no harsh dark/gray slab
background that hurts the eyes or looks like a heavy chrome bar.

## Problem

The in-progress progress surface uses an ugly dark/gray background that clashes
with the desk plate look and is visually harsh.

## In scope

- Restyle progress panel / progress line chrome to match live desk plate
  aesthetic (same family as desk plates/panels — soft, cohesive, not a black
  or heavy gray slab)
- Keep existing progress copy and semantics (`n/m · 进行中：…` / en equivalent)
- Preserve readability of status text on the restyled surface

## Out of scope

- Changing progress counting, task IDs, or dispatch/queue behavior
- Redesigning revise card, chat, or other desk chrome beyond the progress panel
- Remote push / promote to `main`

## Acceptance

1. Progress line during in-progress work no longer sits on a harsh dark/gray
   slab; surface matches desk plate aesthetic
2. Progress text (counts,「进行中」/ status, task id) remains readable
3. Idle / accepted / other progress states stay coherent with the same plate
   language (no regression to a black bar)
4. E2E catalog note for progress panel restyle (E2E-043)

## Assumptions

- “Live desk plate aesthetic” means the existing dark desk plate/panel treatment
  used elsewhere on the live desk (soft plate, not translucent white and not a
  solid black/gray slab) — align progress chrome with that, not invent a new
  theme
