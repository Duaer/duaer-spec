# 222 — Preempt when the Terminal script does not name its wave

## Goal

A queued continue starts even when `running.cmd` only `cat`s the prompt file.

## Why

The first preempt only fired when `running.cmd` contained `- T00N:` lines. Live jobs store the wave in a prompt file that the next enqueue overwrites, so the desk saw no wave ids and left the leftover CLI in place.

## Acceptance

1. Busy lane, `queueDepth > 0`, and no wave ids in the running script → preempt.
2. Busy lane whose named wave is still open → do not preempt.
