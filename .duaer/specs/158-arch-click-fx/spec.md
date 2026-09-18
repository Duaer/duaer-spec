# 158 — Architecture click FX (viewer boot)

## Goal

Node click must open Archify focus-chip and zoom. Root cause: mount omitted
body toolbar nodes (`#btn-preset` etc.), so the viewer threw on init.

## Acceptance

1. Mount includes full body chrome (hidden) + id'd styles (`#archify-fonts`)
2. Viewer initializes (`host._archify.view.reveal`)
3. Click node → focus-chip visible with label; aria-pressed true
4. L0 + Playwright smoke pass
