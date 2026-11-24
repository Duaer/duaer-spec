# Feature Specification: Revise round reliability

**Feature Branch**: `feat/revise-reliability`

**Created**: 2026-09-17

**Status**: Active

## Goal

Revise dispatch is **observable**, **retryable**, and failures are **readable**:
confirm → Terminal enqueue must not report success when preempt failed; Brief
mutations must not stick after a failed launch; client timeout matches server
budgets; status exposes Terminal busy/queue; UI keeps dispatch unlocked when
retryable.

## In scope

- Honest preempt outcome (no false preempted / false HTTP 200)
- Rollback Brief writes if launch/enqueue fails
- Structured revise errors (`code`, `retryable`) + UI copy
- Align client `/api/revise` abort with recreate/init budgets (~3 min)
- `/api/status` includes `terminal: { busy, queueDepth, runnerHealthy }`
- Minimal status/hint line; extend L3 smoke for error shape / rollback unit

## Out of scope

- Desk layout / column redesign
- Full Playwright Terminal automation
- Paid live LLM quality

## Acceptance

1. When preempt cannot clear leftover agents, `/api/revise` fails with
   `PREEMPT_FAILED` and does **not** lock the revise card
2. Failed launch does not leave a new Revision block in Brief (rollback)
3. Client wait ≥ worst-case recreate path; timeout message mentions retry
4. Status poll shows terminal busy/queue when revising
5. `npm run test:live` still passes; new smoke/unit covers rollback or error codes

## Assumptions

- Worktree: `.worktree/feat-revise-reliability`
- Brief: `.duaer/specs/056-revise-reliability/`
