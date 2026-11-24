# Feature Specification: Fix stuck revise UI

**Feature Branch**: `fix/revise-stuck`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

Revise mode must show clear motion: auto-start left-chat questions, no stuck
「正在左侧对话改进…」label, and a visible **再派一版** button in the revise
panel (not only the far confirm card).

## Acceptance

1. Entering revise kicks off an assistant question immediately
2. Revise panel shows status + **再派一版** when card ready; no fake loading label
3. Re-clicking enter revise does not wipe an in-progress revise chat
4. Confirm-card and revise-panel CTAs both dispatch revise
