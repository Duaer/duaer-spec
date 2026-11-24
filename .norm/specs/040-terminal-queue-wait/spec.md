# Feature Specification: Terminal busy-queue honesty

**Feature Branch**: `feat/terminal-queue-wait`

**Created**: 2026-09-16

**Status**: Active

## Goal

When the user revises or re-dispatches while the Terminal runner is already
busy (`running.cmd` present and healthy), **wait for the current task to
finish** — do not interrupt it. Still enqueue via `pending.cmd`. Return
honest API flags (`queued` / `busy` / `reused` or equivalent) so the UI does
**not** claim the agent has already started. Show clear zh-CN / en copy that
the work is queued and will run after the current task ends.

## Problem

1. Busy-runner enqueue can look like an immediate start (e.g.「已送入原
   Terminal」/「数字员工已启动」) even though the new prompt only sits in
   `pending.cmd` until `running.cmd` finishes
2. API reuse success (`reused: true` / `mode: "terminal-reuse"`) does not
   distinguish idle reuse from busy queue-wait
3. Users may think the revise already interrupted or replaced the in-flight
   task

## User decision (frozen)

- **Wait** for the current Terminal task to finish; **do not** interrupt
- Keep writing `pending.cmd` (queue)
- Make enqueue honesty explicit in API **and** UI

## In scope

- Detect busy runner: `running.cmd` present **and** runner healthy
  (heartbeat / PID liveness as already used for reuse)
- On revise / re-dispatch into that runner: write `pending.cmd`; do not kill
  or replace `running.cmd`
- API response must expose queue honesty, e.g.:
  - `queued: true`
  - `busy: true`
  - `reused: true` (same Terminal / runner)
  - (or equivalent fields the UI can rely on without implying “started now”)
- Live desk UI: when those flags indicate busy-queue, do **not** use “agent
  already started” / immediate-reuse success copy
- i18n zh-CN / en message along the lines of:
  - zh-CN:「已排入原 Terminal，当前任务结束后自动跑」
  - en: equivalent (“Queued in the existing Terminal; runs after the current
    task finishes”)
- Preserve post-accept revise policy from prior jobs: **no false `--continue`**
  after accepted delivery; this job is about **busy-queue honesty**, not
  reopening the continue-session debate
- E2E catalog note **E2E-041**

## Out of scope

- Interrupting, preempting, or cancelling the in-flight `running.cmd` task
- Changing first-dispatch / cold-open Terminal flows except shared response
  fields needed for honesty
- Redesigning revise card chrome (038) or desk scroll (039)
- Remote push / promote to `main`

## Acceptance

1. When runner is healthy and `running.cmd` is present, revise / re-dispatch
   writes `pending.cmd` and does **not** interrupt the current task
2. API returns honesty flags such that `queued` + `busy` (and `reused` when
   same Terminal) are true in that case — UI can tell “queued, waiting” from
   “started now”
3. UI does **not** claim the agent already started solely because reuse
   succeeded; shows the queued/wait message (zh-CN + en)
4. Idle healthy runner reuse (no busy `running.cmd`) remains truthful; still
   may reuse the same Terminal without the busy-wait message
5. After accepted delivery, revise still avoids false `--continue` (unchanged
   policy; not regressed by this job)
6. E2E-041 documents busy-queue wait + honest UI/API

## Assumptions

- Runner already serializes: finish current → pick next `pending.cmd`; this
  job makes that behavior **visible and honest**, not a new interrupt model
- Shared launch path in `bin/duaer-live.mjs` + `web/live-dev` i18n/UI are the
  primary touch points
- Implementation deferred; Brief + tasks only for now
