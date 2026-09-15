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
| E2E-001 | After `duaer init`, banner says talk to agent — no slash ops | manual |
| E2E-002 | README: install once, then plain-language asks | manual |
| E2E-003 | Always-on rule requires autonomous job loop without user slash | manual |
| E2E-004 | Default `coach`: unfinished job — agent must not claim done | manual |
| E2E-005 | Converge stamps `accepted`; agent reports ready for review | manual |
| E2E-006 | `duaer-do` skill describes agent-triggered loop | manual |

## Traceability

| Scenario | Spec / feature | Notes |
|---|---|---|
| E2E-001 | init banner | No human phase ops |
| E2E-002 | README | Ask, don’t operate |
| E2E-003 | `duaer-spec.mdc` | Autonomous |
| E2E-004 | policy coach | Handoff etiquette |
| E2E-005 | `delivery.json` | Accept stamp |
| E2E-006 | `duaer-do` | Internal playbook |
