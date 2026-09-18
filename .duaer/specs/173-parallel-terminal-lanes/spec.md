# 173 — Parallel Terminal lanes for N digital employees

## Goal

When kickoff selects workerCount > 1, each worker gets its own Terminal queue
(`.duaer/live-terminal/wN`) so the second window does not exit on runner.lock.d.

## Acceptance

1. Multi-worker dispatch passes queueLane=wN into launchAgent
2. Prompt files are per-lane (no clobber)
3. Same-lane lock message still exists for true collisions
