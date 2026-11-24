# Feature Specification: Live desk left↔right scroll sync

**Feature Branch**: `feat/desk-scroll-sync`

**Created**: 2026-09-16

**Status**: Active

## Goal

On the live desk, the right column grows long across the job lifecycle
(confirm → dispatch → progress → preview → revise) while the left chat stays
anchored at the top. Keep left↔right focus in sync so the content the user
needs on the right scrolls into view when chat activity or mode changes
advance the active stage.

## Problem

1. Right-column content stacks tall; the active section (confirm / progress /
   preview / revise) can sit below the viewport while the user is still
   talking on the left
2. Left chat stays at the top by design; without coordinated scroll, users
   miss the stage that chat just unlocked or updated
3. Manual scrolling the whole page (or losing independent panel scroll) breaks
   the two-column desk model

## In scope

- Independent vertical scroll on the right panel (not whole-page scroll as the
  primary mechanism)
- Auto-scroll the right panel so the **active section** enters view when chat
  activity or mode/stage changes make that section the focus:
  confirm, progress, preview, or revise
- Optionally scroll the left chat log to the bottom when new bubbles arrive
  (keep composer / chat chrome usable)
- Preserve existing confirm-card field layout and copy — no redesign of
  confirm fields

## Out of scope

- Redesigning confirm-card fields, labels, or structure
- Redesigning progress / preview / revise card chrome beyond scroll/focus
- Changing dispatch, agent launch, or revise enqueue semantics
- Remote push / promote to `main`

## Acceptance

1. Right panel scrolls independently; tall stage stacks do not force the left
   chat off-screen as the only way to see later stages
2. When the active stage becomes confirm, progress, preview, or revise (via
   chat activity or mode change), that section scrolls into view in the right
   panel without requiring the user to hunt for it
3. Left chat remains usable at the top of the desk layout; optional auto-scroll
   of the left log to the latest bubble on new messages does not break typing
4. Confirm-card fields are unchanged (same fields / structure; scroll-only UX)
5. E2E catalog note for this behavior (E2E-040)

## Assumptions

- Preferred approach: independent right-panel overflow + `scrollIntoView` (or
  equivalent) on the active section; left log bottom-scroll on new bubbles is
  optional polish if not already reliable
- Existing partial `scrollIntoView` for revise confirm may be extended, not
  replaced wholesale
- Implementation deferred; this Brief + tasks only for now
