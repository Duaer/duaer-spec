# 155 — Architecture iframe expands to canvas (no inner scroll)

## Goal

Where the architecture diagram sits, expand the iframe to the full
canvas (viewBox + embed gutter). No scrollbar inside the diagram —
the desk column may scroll as a whole.

## Acceptance

1. Frame height = scaled viewBox height + 100px top gutter + pad
2. iframe scrolling=no; CSS overflow hidden on the frame
3. Embed height postMessage measures SVG/container bottom
4. L0 archify + L3 live smoke pass
