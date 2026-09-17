# Feature Specification: Progress sync when delivery accepted

**Feature Branch**: `fix/progress-accepted`

**Created**: 2026-09-17

**Status**: Active

## Goal

Task progress must not show `0/N · delivery accepted · 工单完成`. When
`delivery.json` is `accepted`, the desk treats tasks as complete (done ===
total) and reconciles unchecked boxes in `tasks.md` when safe.

## Problem

`dispatchStatus` only rewrites `progress.current` on accept; `done` stays at
the unchecked count. Agents often stamp `delivery.json` without flipping every
`- [ ]` to `- [x]`, so 任务跟进 shows a contradictory `0/3 · …工单完成`.

## In scope

- Normalize progress when accepted: `done = total`, all task rows `done: true`
- Reconcile `tasks.md` unchecked boxes to `[x]` once when accepted (idempotent)
- Unit/smoke coverage; short README/CHANGELOG/E2E note

## Out of scope

- Changing how agents are prompted (except if a one-line reminder helps)
- Progress column layout redesign

## Acceptance

1. Accepted delivery never surfaces `done < total` with an “工单完成 /
   delivery accepted” current line
2. Unchecked tasks in Brief are marked `[x]` after status observes accept
3. `npm test` / `npm run test:live` pass

## Assumptions

- Worktree: `.worktree/fix-progress-accepted`
- Brief: `.duaer/specs/057-progress-accepted/`
