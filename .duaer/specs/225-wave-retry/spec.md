# 225 — Requeue a lost wave

## Goal

If a released wave is still unchecked and the Terminal lane is idle, enqueue it again.

## Why

T007 was marked released, then the runner died and the queue emptied. The desk refused to release that fingerprint again, so the job looked in progress with nothing queued.

## Acceptance

1. An unchecked task-wave fingerprint is dropped when the lane is not busy and the queue is empty.
2. A checked wave, and a non-task fingerprint, stay released.
3. The drop happens before the next wave release, with a cooldown so a just-enqueued job is not duplicated.
