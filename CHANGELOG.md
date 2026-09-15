# Changelog

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
  (`accepted` | `open`)
- `duaer check` reports workplace **and** delivery status
- `duaer check --gate` fails on missing Spec, open tasks, or non-accepted stamp
- Constitution, DUADER, README, ADOPT, and merge checklist require the gate
- Honest scope: gate checks **handoff state**; Spec↔code judgment remains
  agent-assisted

### E2E

- E2E-003 / E2E-004 / E2E-005 for delivery report and gate

## 0.1.1 — 2026-09-15

### Docs / product identity

- Position Duaer as a **delivery OS for AI digital employees**: hire → assign
  (Spec) → work → accept (converge)
- README, ADOPT, DUADER, AGENTS intro, and CLI `init` / `check` / help copy
  use that language
- E2E catalog: E2E-001 (init next steps), E2E-002 (README positioning)

## 0.1.0 — 2026-09-15

First public methodology release.

### Method

- Own **Duaer** Spec-Driven loop: specify → plan → tasks → implement → converge
- Home directory: `.duaer/` (not an embedded third-party kit)
- Cursor skills: `/duaer-specify`, `/duaer-plan`, `/duaer-tasks`, `/duaer-implement`, `/duaer-converge`, …
- Agent ops (`AGENTS.md`) remain authoritative over the method when they conflict

### CLI

- `duaer init [dir] --all|--method|--ops [--force] [--branch <name>]`
- `duaer check [dir]`
- `duaer version`

### Install

```bash
npx github:fujiezee/duaer-spec@v0.1.0 duaer init --here
npx duaer-spec init --here
```
