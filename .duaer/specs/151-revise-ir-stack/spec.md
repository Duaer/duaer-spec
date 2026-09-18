# 151 — Drop deep architecture IR from desk memory

## Goal

「再改一版」must not hit Maximum call stack from architecture IR
serialization. Keep only url / summary / fingerprint / viewBox in memory
after render; resolve IR from disk on dispatch; omit jsonBlock from revise SSE.

## Acceptance

1. After architecture render, `state.architecture.ir` is null (viewBox kept)
2. enterReviseMode / kickoff never JSON.stringify full IR
3. Dispatch loads IR from `architecture/<key>.json` when client sends null
4. Revise chat done SSE has no jsonBlock
5. L0 + live smoke pass; revise kickoff works
