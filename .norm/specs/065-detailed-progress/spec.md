# Feature Specification: Detailed coding progress

**Feature Branch**: `feat/detailed-progress`  
**Brief**: `.duaer/specs/065-detailed-progress/`  
**Status**: Active

## Goal

Live desk progress shows more than 3 coarse tasks: a finer `tasks.md`
checklist on dispatch, stronger agent check-off rules, and live worktree
file activity while the CLI runs.

## Acceptance

1. New dispatch writes ≥6 checkbox tasks (not only T001–T003)
2. `/api/status` includes `activity` (recent changed files / git porcelain)
3. Progress column shows activity under the task list while work is running
4. Agent launch prompt requires expanding/checking detailed tasks
5. `npm test` passes
