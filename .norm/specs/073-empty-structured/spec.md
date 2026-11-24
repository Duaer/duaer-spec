# Feature Specification: Structured chat empty hint

**Feature Branch**: `feat/empty-structured`  
**Brief**: `.duaer/specs/073-empty-structured/`  
**Status**: Active

## Goal

Chat empty-state guidance (“用大白话说想要什么…”) shows as a **structured
step list**, not one jammed semicolon sentence.

## In scope

- Empty hint as ordered / stepped blocks (zh + en)
- Styles matching desk (no cards clutter)
- Locale switch updates the steps

## Out of scope

- Confirm-card structuredHtml changes
- Onboarding wizard beyond empty state

## Acceptance

1. Empty state shows discrete steps (plain words → confirm/dispatch → deliver
   to acceptance), not a single `;`/`；` line
2. Locale switch updates steps; first bubble still hides empty state
3. `npm test` + `npm run test:live` pass
