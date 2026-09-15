# Changelog

## 0.4.0 — 2026-09-15

### Simple everyday ops

- **`/duaer-do`** — one Cursor skill for assign → work → accept
- **`duaer status`** — plain “accepted / not done” (alias of `job`)
- README / init / rules lead with hire → `/duaer-do` → `status`
- Step skills and policy remain available but are advanced, not the default story

## 0.3.0 — 2026-09-15

### Job handoff (not a repo lock)

- Default policy **`coach`**: guide the employee; do not claim "done" until the
  **active job** is accepted — git merge is not blocked
- `.duaer/delivery-policy.json` modes: `off` | `coach` | `strict`
- `.duaer/active-job.json` set by `/duaer-specify`; `duaer job` reports status
- `duaer policy` to show/set mode
- `duaer check` defaults to active-job scope; `--strict` / policy `strict` optional
- `--gate` kept as deprecated alias for `--strict` (job handoff, not CI)
- `--all-jobs` optional; historical features no longer fail the default path
- Docs/rules/constitution demote merge-gate language

### E2E

- E2E-004–007 for coach default, strict optional, active-job scope

## 0.2.0 — 2026-09-15

### Controllable delivery (machine gate)

- `/duaer-converge` writes `.duaer/specs/<feature>/delivery.json`
- `duaer check` / `--gate` for handoff state
- Honest scope: handoff state checkable; Spec↔code still agent-assisted

## 0.1.1 — 2026-09-15

- Digital-employee delivery OS positioning

## 0.1.0 — 2026-09-15

- First public methodology release
