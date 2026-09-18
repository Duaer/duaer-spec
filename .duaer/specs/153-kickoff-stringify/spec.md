# 153 — Bulletproof revise kickoff JSON body

## Goal

「再改一版」must not fail with `kickoff-stringify: Maximum call stack`.
Build the /api/chat body from primitive strings only (no Object.prototype.toJSON,
no String(deepObject) traps).

## Acceptance

1. Kickoff body built via safe primitive JSON helper
2. reviseMessages sanitized to {role, content:string} before kickoff
3. Non-string message content dropped (not String()'d)
4. L3 live smoke passes
