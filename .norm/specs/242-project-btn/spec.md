# 242 — Merge project badge and Projects button

## Goal

The top nav showed both “Project: …” and “Projects”. Merge them into one
button that shows the active project (or “no project”) and opens the drawer.

## Acceptance

1. Desk and dispatch-center top nav have one project control (`#historyToggle`).
2. Label is `project.activeBadge` / `project.noneBadge`; click opens the project drawer.
3. No separate `#projectBadge` element.
4. Tests + E2E + CHANGELOG; merge develop; handoff 8787.
