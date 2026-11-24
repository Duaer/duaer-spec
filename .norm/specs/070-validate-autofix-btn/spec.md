# Feature Specification: Auto-handle on validate fail

**Feature Branch**: `feat/validate-autofix-btn`  
**Brief**: `.duaer/specs/070-validate-autofix-btn/`  
**Status**: Active

## Goal

When the confirm/revise card shows validation failed, offer an **自动处理**
button that runs auto-fix and reports progress in the chat column.

## Acceptance

1. Failed validate shows an **自动处理** button near the fail hint
2. Click posts a chat bubble and calls `/api/validate/fix`, then updates the card
3. Success unlocks confirm/revise dispatch without forcing silent lock; failure stays retryable in chat
4. `npm test` + `npm run test:live` pass
