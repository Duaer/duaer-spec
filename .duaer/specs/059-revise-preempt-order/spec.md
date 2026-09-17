# Feature Specification: Honest revise preempt (enqueue after clear)

**Feature Branch**: `fix/revise-preempt-order`

**Created**: 2026-09-17

**Status**: Accepted

## Goal

After Confirm revise, either the revise Agent is launched and the desk
reports success, or preempt truly failed and nothing was started — never
“Could not preempt…” while Terminal is already running the revise job.

## Problem

`launchInTerminal` enqueues the revise job **before** preempt. Within the
post-preempt wait, the runner starts the new Agent; status then sees
`busy && agentsLeft > 0` and throws `PREEMPT_FAILED`. The API rolls back
Brief while the queued revise Agent keeps working — UI error, work already
underway; retries kill that Agent.

## In scope

- Preempt leftover agents **before** enqueueing the revise Terminal job
- Fail `PREEMPT_FAILED` only when prior agents remain (nothing queued yet)
- Do not treat the newly started revise Agent as a preempt failure
- Tests + CHANGELOG / E2E note

## Out of scope

- Progress scoping (058)
- Changing when priorAccepted revise preempts vs waits

## Acceptance

1. priorAccepted revise: preempt clears leftovers, then enqueue; HTTP 200
2. If leftover agents cannot be cleared, `PREEMPT_FAILED` and **no** new
   Terminal job for that attempt
3. Desk does not show preempt failure while revise Agent is already running
   from that same Confirm tap
4. `npm test` passes

## Assumptions

- Worktree: `.worktree/fix-revise-preempt-order`
- Brief: `.duaer/specs/059-revise-preempt-order/`
