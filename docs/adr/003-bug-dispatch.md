# 003 — Bug dispatch path on Duaer desk

## Context

Chat offered「我要修一个 bug」, but kickoff always wrote `feat/` Briefs and
required modular confirm plus architecture. Bug work needs a shorter gate and
`fix/` branches.

## Decision

1. Persist per-project `deskKind`: `feature` | `bug`.
2. Bug uses one defect card, default architecture skip, short task pool
   (reproduce → fix → regress), and `allocateUniqueBranch(..., kind: "fix")`.
3. Optional hotfix toggle bases the worktree on `main` when that branch exists.
4. Bug chat / validate **auto-fill** project delivery facts (preview URL, start
   scripts, local env hints) into `assumptions` and must not gate on missing
   URL / start command / suspected cause / online-emergency.
5. Feature path stays unchanged.

## Consequences

- Operators can dispatch bugs without redesigning architecture.
- Agents still verify and stamp `delivery.json`; merge target follows AGENTS.md
  (develop, or main then develop for hotfix).
