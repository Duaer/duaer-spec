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

## Traceability

Keep this matrix current when scenarios or specs change.

| Scenario | Spec / feature | Notes |
|---|---|---|
| E2E-001 | `bin/duaer.mjs` init banner | Controllable-delivery onboarding |
| E2E-002 | `README.md` / `ADOPT.md` | Product identity |
