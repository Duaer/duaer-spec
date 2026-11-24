# Feature Specification: Track revise-round task progress

**Feature Branch**: `fix/revise-progress-track`

**Created**: 2026-09-17

**Status**: Accepted

## Goal

After **Confirm revise and dispatch**, 任务跟进 shows **this revision’s**
checklist and updates as work starts — not the prior dispatch’s completed
`T001…` pile, and not a frozen “delivery accepted · 工单完成” while Terminal
is already running the revise.

## Problem

Progress parses the whole `tasks.md`. After revise, old tasks stay `[x]` so
the bar looks finished (or accepted-normalized to N/N) while the new `R{n}-*`
round has started. Live `revisionCount` can lag; status may still say
`accepted`, so the wrong run-block is updated and revise work looks untracked.

## In scope

- Scope progress to dispatch (pre-Revision section) vs active `Revision N`
- Infer active revision from job / delivery / tasks.md headers and `R{n}` ids
- While revising (or Terminal busy with open `R{n}` tasks), do not force
  accept-complete progress
- Persist inferred `revisionCount` onto the live job when missing
- Tests + CHANGELOG / E2E note

## Out of scope

- Layout / column redesign
- Changing revise launch / preempt behavior

## Acceptance

1. After Confirm revise, progress shows only this revision’s tasks (e.g. `0/3`
   then rising), under the Revision N run block
2. While revise is active, status is not stuck on `delivery accepted · 工单完成`
3. When revise delivery accepts, that revision shows `N/N · …完成`
4. `npm test` passes

## Assumptions

- Worktree: `.worktree/fix-revise-progress-track`
- Brief: `.duaer/specs/058-revise-progress-track/`
