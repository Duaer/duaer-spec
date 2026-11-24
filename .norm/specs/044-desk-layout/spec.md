# Feature Specification: Live desk layout cleanup

**Feature Branch**: `fix/desk-layout`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

Clean up the live desk layout so it feels coherent and calm after recent
header / history / wide-desk changes — clear header hierarchy, sensible
history panel placement, balanced two-column spacing, no visual clutter —
while keeping history, i18n, flow tagline, and wide desk.

## Problem

User report: 布局很乱 / 体验不好. After Spec 041 (wide desk) and Spec 043
(history + header row with flow tag + lang), the live desk chrome reads as
messy: competing header signals, awkward history panel placement, uneven
two-column spacing, and visual noise.

## Confirmed intent (from ask)

- **Keep** features: job history, zh-CN/en i18n, flow tagline, wide desk
- **Fix** presentation/layout UX only — not remove those capabilities
- No implementation in this Brief-only setup pass; implement in follow-up

## In scope

- Header hierarchy: clear primary vs secondary chrome (Live desk, flow
  tagline, history control, language switch, brand)
- History panel placement that does not fight the desk columns or header
- Two-column desk spacing (chat left / cards right) that uses wide width
  without cramped or sparse clutter
- Reduce visual clutter (redundant borders, competing density, noisy stacks)
- Preserve history restore, i18n strings/coverage, flow tagline, wide layout
- E2E catalog note for layout cleanup (next free id, e.g. E2E-045)

## Out of scope

- New history features (delete/archive, cloud sync, full transcripts)
- Changing dispatch / queue / Terminal runner behavior
- Redesigning revise / progress / preview card internals beyond layout
  chrome needed for coherence
- Remote push / promote to `main`

## Acceptance

1. Header reads as one clear hierarchy (no stacked competing titles / controls)
2. History opens/places without overlapping or crowding the two-column desk
3. Two-column spacing is balanced on wide and narrow viewports
4. History, i18n, flow tagline, and wide desk remain functional
5. E2E note documents the cleaned layout; no push unless asked

## Notes

- Worktree: `.worktree/fix-desk-layout` on `fix/desk-layout`
- Brief: `.duaer/specs/044-desk-layout/`
- Related: 041-desk-wide-queue, 043-live-history
