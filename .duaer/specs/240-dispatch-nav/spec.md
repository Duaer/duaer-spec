# 240 — Dispatch center top nav like the desk

## Goal

The dispatch center must show the same top navigation as the home desk
(brand, 调度中心, project badge, 项目, 数字员工, 设置, language, GitHub).

## Acceptance

1. Dispatch-center HTML uses `header.top` with the same controls as the desk.
2. Brand links to `/`; 项目 / 数字员工 / 设置 open desk drawers via `?open=`.
3. Language switch and GitHub stars work on the dispatch page.
4. Tests + E2E + CHANGELOG; merge develop; handoff 8787.
