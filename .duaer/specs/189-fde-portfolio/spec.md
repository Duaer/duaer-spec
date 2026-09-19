# 189 — FDE project portfolio status strip

## Goal

Operators see each project’s delivery status at a glance in the Projects drawer,
open deliverables in one click, and get a clear next action in the Progress
column — without learning Duaer phases.

## In scope

- Derive status: drafting / confirming / building / delivered / revising
- Enrich `GET /api/projects` project rows with status + nextAction + hasDeliverables
- Portfolio list: status chip + open-deliverables control
- Progress: stage strip + next-action line; deliverables CTA stays primary
- Docs (live-desk) + E2E + L0/L3

## Out of scope

- Dedicated cloud / multi-user accounts
- Session export/import
- Changing BYOC deploy hosts

## Acceptance

1. `/api/projects` includes `deliveryStatus` and `nextAction` per project when a
   session exists (or sensible defaults when empty).
2. Portfolio row shows a status chip; deliverables openable when `hasDeliverables`.
3. Progress column shows stage summary + next-action copy for the active desk.
4. `npm test` (targeted) + `npm run test:live` pass.
