# Feature Specification: Beginner line in header center

**Feature Branch**: `feat/header-beginner`  
**Brief**: `.duaer/specs/075-header-beginner/`  
**Status**: Active

## Goal

「小白也能用 FED」 lives in the **top nav center** (always visible). It no
longer sits in the chat empty state where it only flashes before the ready
bubble hides the empty block.

## Acceptance

1. Header center shows beginner line (zh + en); chat empty no longer uses that title
2. Chat empty keeps the three how-to steps only (no flash of the beginner slogan)
3. `npm test` + `npm run test:live` pass
