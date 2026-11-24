# Spec: Fix orchestration wave deadlock after silent wait

## Goal

After a wave finishes and `tasks.md` is checked, the orchestrator must release
the next ready wave. Agents must not sit in a live Terminal session waiting —
that keeps `lane_busy` and blocks continue forever.

## In scope

- Prompt: after a wave, exit the CLI session so the runner becomes idle /
  can drain a queued `--continue`
- `pendingWaveReleases`: enqueue next wave even when the lane is busy
  (FIFO serialize); do not stall on `lane_busy`
- Accept-nudge: same enqueue-when-busy behavior
- Docs / tests / E2E note

## Out of scope

- Changing dependsOn / atomic task splitting
- Fixing polluted startCommand content from other projects (separate)

## Acceptance

- [ ] Status with T001 done + next wave ready enqueues/releases while lane busy
- [ ] Prompts no longer tell the agent to 静默停等 with the session held open
- [ ] Unit tests updated; npm test passes
