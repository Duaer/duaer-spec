# Feature Specification: Fix revise enqueue + dark revise card

**Feature Branch**: `fix/revise-enqueue-style`

**Created**: 2026-09-16

**Status**: Active

## Goal

Make revise enqueue truthful: when the UI reports「已送入原 Terminal」, an agent
must actually start. Reuse the same Terminal window and queue when healthy; do
not treat a dead or stale runner as live (false PID reuse). Avoid `--continue`
against an ended session. Prefer a fresh agent prompt (no `--continue`) after
accepted delivery while still enqueueing through the Terminal queue. Restyle
the revise card to the desk dark plate/panel look (not translucent white).

## Problem

1. UI can show「已送入原 Terminal」while no agent runs
2. False PID reuse / stale runner makes enqueue look successful
3. `--continue` after an ended session fails to launch work
4. Revise card chrome is translucent white and clashes with dark plate/panel desk

## In scope

- Runner liveness: heartbeat (or equivalent) so dead PIDs are not treated as
  active Terminal targets
- Enqueue must actually trigger the agent in the intended Terminal when the
  runner is alive; same window OK
- After accepted delivery, prefer new agent prompt without `--continue`, still
  via Terminal queue
- Do not use `--continue` when the prior session has ended
- Restyle revise card to dark plate/panel desk style

## Out of scope

- Changing first-dispatch / non-revise launch flows except as needed for shared
  runner health
- Redesigning left-chat revise dialogue copy beyond what enqueue honesty needs
- Remote push / promote to `main`

## Acceptance

1. When UI shows「已送入原 Terminal」after revise confirm, an agent process
   actually starts (or clearly fails with honest UI — no false success)
2. A dead/stale runner PID is not reused as a live Terminal target; heartbeat
   (or equivalent) detects liveness before enqueue success
3. Same Terminal window may be reused when the runner is alive; enqueue must
   still trigger the agent
4. After accepted delivery, revise relaunch prefers a new agent prompt without
   `--continue`, while still using the Terminal queue
5. `--continue` is not used against an ended session as the sole launch path
6. Revise card matches dark plate/panel desk styling (no translucent white card)
7. E2E catalog note (E2E-039)

## Assumptions

- Terminal queue / desk runner already exists; this job hardens liveness and
  post-accept launch policy, then restyles the revise card
