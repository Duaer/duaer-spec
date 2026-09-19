# Feature Specification: Atomic verifiable tasks with monitorable progress

**Feature Branch**: `feat/atomic-tasks`

## Goal

When decomposing work (Break down / kickoff task pool / `tasks.md`), every
task MUST be an **atomic, independently verifiable** unit, and every task's
progress MUST be **monitorable** via a markdown checkbox that the FDE desk
(and agents) can poll.

## Why

Coarse mega-tasks hide progress and block wave orchestration. Acceptance
bundled into one line cannot be checked off piecemeal.

## In scope

- Constitution + duaer-do / duaer-tasks / template wording for the rule
- Kickoff `buildTaskPoolFromModules` splits module acceptance into one
  checkbox task per acceptance line (plus impl / verify / shared steps)
- Preview task graph uses the same atomic split so path matches pool
- `tasks.md` footer / dispatch prompt reinforce: checkbox = progress signal
- Tests + E2E catalog row

## Out of scope

- Changing orchestration wave algorithm beyond richer ready sets
- Dedicated cloud / npm release

## Acceptance

1. Constitution (or equivalent always-on rule) states: decompose to atomic
   verifiable tasks; each task progress monitorable via `- [ ]` / `- [x]`
2. Module with multi-line acceptance yields one task per acceptance line in
   the task pool / `tasks.md`
3. Preview pool for the same modules has matching atomic acceptance tasks
4. Unit tests cover the split; E2E catalog mentions the rule
5. Agents following duaer-do Break down must not leave only coarse mega-tasks

## Assumptions

- Prefer splitting on acceptance lines / `;` / `；` (existing
  `splitAcceptanceLines`) rather than LLM rephrasing at kickoff
