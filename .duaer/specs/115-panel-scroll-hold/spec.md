# Brief: Stop 需求/运行 panels auto-scrolling back up

## Symptom

Scrolling the requirements (需求) or progress (运行) column to the bottom
jumps back up shortly after.

## Cause

Status poll (~3s) calls `renderProgress` / `renderPreview`, which always call
`focusRightPanel()`. That scrolls both columns to the “active” stage near the
top, fighting manual scroll.

## Acceptance

1. Manual scroll in card-panel or progress-col is not overridden by status poll
2. Explicit stage changes (dispatch, restore, confirm, new run block, preview
   first shown) may still force-focus
3. Polling with unchanged progress does not call focusRightPanel
