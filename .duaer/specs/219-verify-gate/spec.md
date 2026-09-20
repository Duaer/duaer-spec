# 219 — Machine verify gate

## Goal

The live desk, not the digital employee, decides whether `delivery.json` may stay `accepted`.

## In scope

- Read the product worktree `.duaer/memory/verify.json`.
- When every task is checked, or the employee writes `accepted`, run `commands` in the worktree.
- Non-zero exit: set status back to `open`, store command / exit / tail on `delivery.verification`, enqueue the log on the regression lane (last lane when N≥2). Do not nudge “stamp accept”.
- Exit 0: allow `accepted` and keep the same evidence.
- Missing or invalid contract: do not accept. Status tells the operator the contract is missing or unreadable.
- `{ "waiver": "docs-only" }` with no commands passes without a shell. If a command list was already seen, later edits cannot replace it with a waiver.
- `init` / `update` must not overwrite an existing product `verify.json`.

## Out of scope

- Screen recordings, a second judge model, a new employee role, post-deploy browser checks.
- Parsing commands out of `testing.md` prose.

## Acceptance

1. A failing command cannot leave the job or deliverables page in the accepted state.
2. A passing command records the command and exit code on `delivery.json`.
3. The all-tasks-done “stamp accept” nudge is gone.
