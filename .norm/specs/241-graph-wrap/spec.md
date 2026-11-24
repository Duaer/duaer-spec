# 241 — Dispatch graph wrap + live node status

## Goal

Dispatch nodes should not sit in one endless row — wrap after a few columns.
Task progress (done / in progress / waiting) must be visible on each node and
update live on the dispatch-center stage.

## Acceptance

1. Dependency ranks wrap after 4 columns onto the next band.
2. Node `tag` + `sublabel` show progress; colors still map to status.
3. Dispatch center always re-renders from task IR + progress (not a stale URL).
4. Poll `/api/status` and remount when progress changes.
5. Tests + E2E + CHANGELOG; merge develop; handoff 8787.
