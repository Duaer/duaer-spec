# 193 — Dispatch must finish every task (no early “not accepted”)

## Goal

FDE-dispatched digital employees must complete **every** assigned task and
stamp `delivery.json` `accepted`. They must not stop with
`⏳ Job not accepted yet` mid-job (that freezes product coding).

## Acceptance

1. Kickoff / wave / continue / revise prompts forbid “Job not accepted yet”
   as a final handoff; require ✅ accepted only after all tasks + stamp.
2. When all `tasks.md` boxes are checked but delivery is not accepted, status
   poll nudges an idle lane to stamp accepted (once).
3. `duaer-do` skill: for `source: live-dispatch` (and FDE worktrees), never end
   unaccepted.
4. L0 + unit/smoke markers; merge to develop.
