# 234 — Dispatch graph present: no click-zoom

## Goal

派工图 fullscreen canvas stays full-size. Node click shows the same passport /
focus interaction as architecture, but must **not** zoom/enlarge the diagram
(it is already large enough).

## Acceptance

1. 「查看派工图」opens present view with `noz=1` (full canvas, no reveal zoom).
2. Node click still shows focus-chip / relations; camera scale stays ≤ 1.
3. Dispatch-center click uses the same no-zoom present URL.
4. Tests + CHANGELOG; merge develop; handoff 8787.
