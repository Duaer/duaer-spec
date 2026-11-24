# 221 — Preempt a finished wave so the next job starts

## Goal

After a wave's tasks are checked, the next queued `--continue` starts even if the CLI did not exit.

## Why

The employee prints「本波完成，退出等编排器」and stays in the session. The desk already enqueued the next wave, then refuses to release that fingerprint again. The runner cannot dequeue until the leftover process dies, so the job looks stuck after the first wave.

## In scope

- On status poll, if `running.cmd`'s wave ids are all `[x]` and `queueDepth > 0`, preempt that session.
- Do not preempt a session whose own wave is still open.

## Out of scope

- Changing task assignment, verify.json, or the personal-intro product job.
- Killing the Terminal runner itself.

## Acceptance

1. A busy lane whose running script wave is fully checked, with a queued job, is preempted.
2. A busy lane whose running script wave is still open is not preempted, even if an earlier wave is done and the queue is non-empty.
3. The decision is covered by unit tests; live-desk docs and the E2E catalog record the behavior.
