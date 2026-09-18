# 138 — 再改一版 posts a visible chat message

## Goal

Clicking「再改一版」must send a visible user message into the left
revise dialogue, then kick off the employee reply.

## Cause

Kickoff only pushed a filtered `（系统）…` user turn, so the chat showed
no user bubble. Stuck `busy` could also skip kickoff.

## Acceptance

1. Click「再改一版」appends a visible user bubble + `reviseMessages` entry
2. System kick still runs for the model (hidden from UI)
3. Enter clears chat `busy` so kickoff is not skipped
4. L3 `npm run test:live` passes
