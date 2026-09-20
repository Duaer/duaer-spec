# 238 — Dispatch center shows the battlefield in place

## Goal

The dispatch center already has a large screen. Show the task graph there.
Do not open another fullscreen window when viewing or clicking the graph.

## Acceptance

1. The dispatch-center stage mounts the graph inline (`stage: true`).
2. Clicks on that page do not call `/api/open-external` or present.
3. Desk "view graph" opens the dispatch center, not a present window.
4. Architecture diagrams on the desk still open present.
5. Tests + E2E + CHANGELOG; merge develop; handoff 8787.
