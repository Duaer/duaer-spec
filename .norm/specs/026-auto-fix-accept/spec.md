# Feature Specification: Auto-fix button on accept failure

**Feature Branch**: `feat/auto-fix-accept`

**Created**: 2026-09-16

**Status**: Active

## Goal

When confirm auto-accept fails (`自动验收未通过`), show an **自动修正** button
on that bot message. Clicking it asks the model to fix the confirm card from
the listed issues, then re-runs accept (and on success continues to dispatch
as usual).

## Acceptance

1. Failed `/api/confirm` bubble includes an 自动修正 action button
2. Click calls `/api/confirm/fix` with card + issues
3. Fixed fields apply to the card; if accept passes, same success path as
   normal confirm (Brief + dispatch panel)
4. If still failing, show issues again with another 自动修正 button

## Out of scope

- Revise-card flow
- Silent fix without a button
