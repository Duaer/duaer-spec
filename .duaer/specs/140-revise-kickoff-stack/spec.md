# 140 — Revise kickoff keeps model reply (no stack-overflow wipe)

## Goal

「再改一版」must show the model’s spoken reply. Never replace it with
「改进对话没启动起来…你也可以直接在左侧输入」.

## Cause

SSE `done` spread the full parsed object (nested IR-like JSON).
`JSON.stringify` threw Maximum call stack size exceeded; the client
overwrote the already-streamed assistant text with reviseKickoffFail.

## Acceptance

1. Chat `done` SSE payload is flat / safely stringifiable
2. If done fails but deltas already arrived, keep the streamed reply
3. Remove the “type on the left” kickoff-fail copy
4. L3 smoke + targeted unit check pass
