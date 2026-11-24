# 235 — Dispatch graph node run status in passport

## Goal

On the 派工图, each task node shows run state (completed / in progress / waiting)
on the box and in the click passport card, so the operator can see progress at a glance.

## Acceptance

1. Nodes are tagged 已完成 / 进行中 / 等待中 (locale-aware) from live progress.
2. Click passport card shows that status (and worker / title) via Archify sources.
3. 「查看派工图」rebuilds the IR from the latest job progress before opening present.
4. Unit tests cover status resolution; E2E + CHANGELOG; merge develop; handoff 8787.
