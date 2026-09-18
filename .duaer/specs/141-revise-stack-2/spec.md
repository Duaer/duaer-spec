# 141 — Stop Maximum call stack on 再改一版

## Goal

Clicking「再改一版」must start the model reply. Never show
「Maximum call stack size exceeded」in the chat bubble.

## Cause

Stack overflow could fire outside the kickoff try (setBusy → architecture
fingerprint / panel sync) or from deep JSON; the catch then painted the
raw English error into the bubble when no deltas had arrived yet.

## Acceptance

1. Kickoff work runs inside try; architecture fingerprint is safe
2. Persist omits deep architecture.ir (url/summary only)
3. Chat done SSE stays flat; never surface “call stack” to the user
4. L3 smoke passes
