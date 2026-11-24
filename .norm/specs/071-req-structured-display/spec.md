# Feature Specification: Structured requirements display

**Feature Branch**: `feat/req-structured-display`  
**Brief**: `.duaer/specs/071-req-structured-display/`  
**Status**: Active

## Goal

Middle confirm/revise card fields show structured blocks (lists / items),
not one jammed paragraph when the model returns `;` / `；` / numbered clauses.

## Acceptance

1. Semicolon-joined acceptance renders as separate list items
2. Inline `1、… 2、…` renders as an ordered list
3. List items have clear visual separation (req-item)
4. `npm test` + `npm run test:live` pass
