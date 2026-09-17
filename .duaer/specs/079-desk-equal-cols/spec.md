# Feature Specification: Sticky header, equal-height scrolling columns

**Feature Branch**: `feat/desk-equal-cols`  
**Brief**: `.duaer/specs/079-desk-equal-cols/`  
**Status**: Active

## Goal

Live desk: **top nav stays put**; the three columns share one height; **middle
(and all columns) scroll inside** instead of growing the page.

## Acceptance

1. Header remains visible while columns scroll (sticky/fixed in shell)
2. Chat / requirements / progress columns are equal height in the remaining viewport
3. Middle column (`card-panel`) scrolls internally; chat log and progress keep inner scroll
4. `npm run test:live` passes; E2E catalog updated
