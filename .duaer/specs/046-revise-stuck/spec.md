# Feature Specification: Prior-accepted revise must preempt busy runner

**Feature Branch**: `fix/revise-stuck`

**Created**: 2026-09-16

**Status**: Active

## Goal

After a job is accepted, a user revise must actually start in Terminal — not
sit forever behind a still-running first agent that already finished the
accepted work.

## Symptom

1. First agent is still running in Terminal (`running.cmd` healthy) after the
   job has been **accepted** (`delivery.json` accepted / priorAccepted path).
2. User submits revise from the Live desk.
3. `POST /api/revise` returns **HTTP 200** and reports enqueue / queue honesty
   (`queued` / `busy` / reuse flags as designed).
4. No new Terminal revise session starts: the revise prompt stays behind the
   still-running first agent and never becomes the active runner work.

## Problem

Busy-queue policy from `040-terminal-queue-wait` correctly waits when the
in-flight task is still the live job. After **accept**, that first agent is
no longer the work the user wants; a priorAccepted revise must **preempt**
the busy runner so the queued revise becomes `running` and Terminal shows
the revise prompt.

## Out of scope

- Changing enqueue honesty for revise while the job is still in progress
  (pre-accept busy wait stays)
- Reworking the full Terminal FIFO architecture beyond priorAccepted preemption
- UI redesign unrelated to starting the revise after accept

## Acceptance

1. When revise is dispatched on a **priorAccepted** job and the Terminal runner
   is busy with the first agent, the runner is preempted so the queued revise
   becomes the active task (starts in Terminal).
2. `POST /api/revise` still returns a settled HTTP response (200 or clear
   4xx/5xx); success implies the revise is running or will run without being
   stuck forever behind the accepted first agent.
3. Pre-accept busy revise behavior is unchanged: still enqueue and wait; do
   not preempt an in-progress (not yet accepted) first agent.
4. Verification evidence recorded for the preempt path (manual / curl as
   appropriate); next E2E id from catalog when documenting.

## Assumptions

- “PriorAccepted” means delivery / job state already accepted before this
  revise dispatch.
- Preempt means stop or replace the stale first-agent `running.cmd` so the
  revise `pending` / new job can start — not leave HTTP 200 with no Terminal
  revise forever.
