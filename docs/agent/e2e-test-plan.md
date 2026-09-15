# E2E test plan (template)

Each adopting project should maintain its own E2E scenario catalog. This file is
a **template** for that catalog — not a product suite.

When a change is user-visible or protocol-visible, add or update a scenario
before or alongside the change (see [R3](workflow.md#r3--e2e-coverage-doc)).

## Scenario template

```text
ID:          E2E-NNN
Title:       Short name
Preconditions:
Steps:
Expected:
Specs:       Links to specs / Duaer feature dirs
Status:      planned | automated | manual
```

## Catalog

This repository’s own product surface (CLI + docs). Adopters replace or extend
the table for their app.

| ID | Title | Status |
|---|---|---|
| E2E-001 | After `duaer init`, CLI prints hire → assign → accept next steps | manual |
| E2E-002 | README positions Duaer as delivery OS for digital employees | manual |
| E2E-003 | `duaer check --job` reports open tasks on active job | manual |
| E2E-004 | Default `coach` policy: unfinished job warns but check exits 0 | manual |
| E2E-005 | After converge stamps `accepted`, `duaer job` shows accepted | manual |
| E2E-006 | `duaer policy . strict` then unfinished job makes check exit 1 | manual |
| E2E-007 | `--all-jobs` is optional; default scope is active job only | manual |

## Traceability

Keep this matrix current when scenarios or specs change.

| Scenario | Spec / feature | Notes |
|---|---|---|
| E2E-001 | `bin/duaer.mjs` init banner | Onboarding |
| E2E-002 | `README.md` / `ADOPT.md` | Product identity |
| E2E-003 | active job delivery check | Open `- [ ]` |
| E2E-004 | `delivery-policy.json` coach | Not a repo lock |
| E2E-005 | `/duaer-converge` → `delivery.json` | Accept stamp |
| E2E-006 | policy strict | Optional hardness |
| E2E-007 | `--all-jobs` vs active | Scope |
