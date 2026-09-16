# Feature Specification: Live revise after preview feedback

**Feature Branch**: `feat/live-revise`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

After the user opens the finished product and is not satisfied, they can give
feedback on the live desk; the system understands the ask and relaunches the
digital employee on the **same** product worktree to improve.

## In scope

- UI after `delivery.json` accepted: feedback box +「继续改进」
- `POST /api/revise`: append revision to product Brief/tasks, reopen delivery,
  relaunch CLI agent (same worktree)
- Optional light restatement of feedback into the Brief
- Resume progress polling after revise
- Docs (EN no CJK) + E2E scenario

## Out of scope

- Creating a brand-new worktree for every revision
- Changing the original confirm-card flow before first dispatch
- Automatic satisfaction scoring

## Acceptance

1. When status is accepted and preview is shown (or missing), revise panel is
   visible
2. Submitting non-empty feedback calls `/api/revise`, updates product
   `spec.md` / `tasks.md`, sets delivery back to open (not accepted)
3. Agent Terminal relaunches with a revise prompt that cites the feedback
4. Status poll resumes until the next accept
5. English docs mention the revise loop without CJK

## Assumptions

- Same `dispatch.worktreePath` / Brief folder is reused
- User feedback authorizes another agent run (not a remote push by itself)
