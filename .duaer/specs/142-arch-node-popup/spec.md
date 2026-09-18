# 142 — Architecture node click shows passport popup

## Goal

In the desk architecture embed, clicking a system node must show Archify’s
semantic passport popup (`.focus-chip`), same as the standalone Archify viewer.

## Cause

Archify’s `data-embed=true` stylesheet sets `.focus-chip { display: none
!important }`, which hid the node detail layer inside the desk iframe.

## Acceptance

1. Embed CSS override restores `.focus-chip` (still respects `[hidden]`)
2. Node click still zooms; passport panel appears over the diagram
3. Serve path re-applies patches (existing HTML picks up the fix)
4. `npm run test:live` + archify unit tests pass
