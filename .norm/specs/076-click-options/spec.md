# Feature Specification: Clickable choice chips always

**Feature Branch**: `feat/click-options`  
**Brief**: `.duaer/specs/076-click-options/`  
**Status**: Active

## Goal

Whenever the assistant asks the user to **choose**, the desk shows **clickable
chips** that send on tap — users should not have to type the choice by hand.

## In scope

- Chat / revise prompts require `options` for discrete choices
- Server + client enrich options from numbered / A-B reply text when JSON omits them
- Stronger chip affordance; ready bubble ships starter chips
- Tests for option enrichment

## Acceptance

1. Asking a choice question yields 2+ clickable chips (from JSON or reply parse)
2. Chip click sends that text as the user message (no typing)
3. `npm test` + `npm run test:live` pass
