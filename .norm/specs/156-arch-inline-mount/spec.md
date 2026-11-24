# 156 — Inline architecture mount (no iframe)

## Goal

Show the Archify architecture diagram with the same look (full canvas SVG,
node passport on click) **without an iframe**. Mount into a normal page
host via Shadow DOM so Archify CSS stays isolated and height flows with
the canvas.

## Acceptance

1. Desk architecture hosts are `<div class="architecture-mount">`, not iframe
2. SVG + Archify diagram CSS mount in shadow root; height is content-driven
3. Node click shows passport (label/type/links from IR JSON)
4. Previous + accordion diagrams use the same mount
5. GET `/api/architecture/<key>.json` served for passport data
6. L0 + L3 live smoke pass
