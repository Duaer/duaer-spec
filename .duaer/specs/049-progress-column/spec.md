# Feature Specification: Live desk progress column

**Feature Branch**: `feat/progress-column`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk becomes **three columns**: (1) chat widest on the left, (2) middle
column for requirements / confirm / dispatch / revise cards, (3) task progress
alone on the far right.

## Problem

Progress currently lives inside (or stacked with) the requirements /
dispatch / revise column. That mixes job controls with run timeline and
makes chat compete for width with a crowded right stack.

## In scope

- Split live desk into three columns as above
- Keep chat the widest column
- Move task progress into its own far-right column (run timeline /
  per-revision progress)
- Ensure progress is not rendered inside the requirements / confirm /
  dispatch / revise column

## Out of scope

- Changing dispatch / revise / queue / agent-launch behavior
- Redesigning chat or card internals beyond layout column placement
- Remote push / promote to `main`

## Acceptance

1. Progress is **not** inside the requirements / confirm / dispatch / revise
   column
2. Chat is the **widest** of the three columns
3. The far-right progress column shows run timeline / per-revision progress

## Assumptions

- Middle column retains the existing requirements → confirm → dispatch →
  revise card flow
- Progress column reuses existing progress / timeline data; placement and
  ownership of the column are the product change
- Worktree: `.worktree/feat-progress-column` on `feat/progress-column`
- Brief: `.duaer/specs/049-progress-column/`
