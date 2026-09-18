# 159 — Architecture mount auto height

## Goal

Inline architecture host height follows the SVG canvas (gutters included),
not the viewport. Archify reader CSS (`min-height:100vh`,
`height:calc(100dvh…)`) was locking a black fixed box.

## Acceptance

1. Host chrome CSS overrides 100vh/100dvh; placed after Archify styles
2. Mount height ≈ svg + gutters, not `window.innerHeight`
3. Click focus-chip still works
4. L0 + playwright height smoke pass
