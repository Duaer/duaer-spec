# Feature Specification: Progress below dispatch/revision block

**Feature Branch**: `fix/progress-below`

**Created**: 2026-09-16

**Status**: Active

## Goal

After dispatch or revise, task progress must render **below** that
dispatch/revision block — not stacked on top of the right panel. Each
revision’s progress stays with its own block so ownership is clear.

## Problem

Progress for the live (or latest) run piles at the top of the right panel,
detached from the dispatch/revision result it belongs to. Older revisions
lose a clear link between their result block and their progress.

## In scope

- Place progress for revision N under that revision’s result block
- Keep older progress anchored to its own historical block
- Avoid a single progress pile at the top of the right panel

## Out of scope

- Changing dispatch/revise queue or agent-launch behavior
- Restyling progress chrome beyond placement/ownership
- Remote push / promote to `main`

## Acceptance

1. Progress for revision N renders under that revision’s result block
2. Older progress stays with its own block (not relocated to the latest)
3. No single pile of progress at the top of the right panel after
   dispatch/revise

## Assumptions

- “Revision block” means the dispatch/revision result unit already shown in
  the live desk right panel / dialogue flow
- Placement is UI-only; progress event semantics stay the same
