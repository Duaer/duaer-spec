# 201 — Architecture click opens fullscreen; keep user-facing hints

## Goal

1. Keep clear user-facing hints (e.g. task-path copy about layout / worker
   colors) — written for humans, not jargon.
2. Clicking the system architecture diagram (and task-path diagram) opens the
   Archify HTML in a **new tab** with `present=1` for a fullscreen view.

## Acceptance

1. Task-graph hint text stays user-facing (HTML fallback matches i18n).
2. Architecture panel hint mentions click-to-fullscreen when a diagram is shown.
3. Click on architecture / task-graph mounts opens `/api/architecture/….html?present=1`.
4. L0/L1/L3; merge develop.
