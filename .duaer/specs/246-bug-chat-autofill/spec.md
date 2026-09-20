# Feature Specification: Bug chat autofills project delivery facts

## Goal

When `deskKind=bug`, the defect dialogue must **not** repeatedly ask the
operator for facts the desk already knows from project delivery (preview URL,
start scripts, local ports/env, online-emergency default). Fill those into
`assumptions` automatically; only ask for missing **symptom / repro / expected
vs actual**.

## Why

Operators already delivered a product. Re-asking URL / start command / machine
ports / suspected cause / whether production-urgent blocks the card and feels
like a loop.

## Acceptance

1. Bug chat system prompt and follow-up include a **project delivery context**
   block (URL, start scripts, path/port hints) when the active project has them.
2. Bug dialogue rules forbid asking for those delivery facts when context
   covers them; suspected cause defaults to「待复现定位」; online emergency
   defaults to **no** (fix from develop) unless the user says production/urgent.
3. `/api/validate` for `deskKind=bug` does **not** fail solely for missing URL /
   start command / env / suspected cause / online-emergency; it enriches
   `assumptions` from context and filters those issue phrases.
4. E2E catalog + live-desk / ADR note updated; L0 + unit + `npm run test:live`.

## Out of scope

- Changing bug kickoff pool or hotfix checkbox UX
- Inventing a public production URL the project never recorded
