# 233 — Dispatch graph present fullscreen like architecture

## Goal

「查看派工图」must open the Archify **present** view (full-viewport canvas) with the
same click / node passport behavior as system architecture — not a clipped
dispatch-center embed.

## Acceptance

1. 「查看派工图」opens `dispatchGraphUrl?present=1` in a new tab (same helper as architecture).
2. Dispatch-center stage canvas fills the remaining viewport; click opens the same present URL.
3. E2E / unit markers updated; CHANGELOG; merge develop; handoff 8787.
