# Duaer methodology

**duaer-spec** owns this method. Treat AI coding agents as **digital employees**:
you assign a Brief (Spec), they follow a fixed work order, and the **job** only
counts as done after **converge** accepts it — then `duaer job` shows accepted.

Artifacts live under `.duaer/`; Cursor skills are `duaer-*` at `.cursor/skills/`.

**Precedence:** root [`AGENTS.md`](AGENTS.md) / [`docs/agent/`](docs/agent/) win
over anything here for isolation, commits, and Issue/PR gates.

**Handoff is job-level**, not a repository merge lock. Policy:
`.duaer/delivery-policy.json` (`off` | `coach` | `strict`, default `coach`).

## Read before work

1. `.duaer/memory/constitution.md` — process principles
2. `.duaer/memory/project-context.md` — as-is implementation truth
3. `.duaer/memory/testing.md` — verification expectations
4. Active job: `.duaer/active-job.json` → feature under `.duaer/specs/<nnn-slug>/`

## Standard path

**Full (recommended):**

1. `/duaer-constitution` — only when principles change
2. `/duaer-specify` — **Assign**: Brief + set `active-job.json`
3. `/duaer-clarify` — optional
4. `/duaer-plan` — technical plan aligned with project-context
5. `/duaer-checklist` — optional quality checklist
6. `/duaer-tasks` — checkbox task breakdown
7. `/duaer-analyze` — optional consistency check
8. `/duaer-implement` — implement tasks only
9. `/duaer-converge` — **Accept**: compare to Spec; write `delivery.json`
10. `duaer job .` — **Handoff**: may this job be reported done?

**Small feature:** specify → plan → tasks → implement → converge → `duaer job`  

**Hotfix:** specify (mark hotfix) → tasks → implement → converge → `duaer job`  
Never skip specify (assign) or converge (accept). Under coach/strict, never claim
"done" while `duaer job` is unfinished.

## Install

```bash
npx duaer-spec init --here
duaer policy . coach
```

Or see [`ADOPT.md`](ADOPT.md).

## Feature directory shape

```text
.duaer/delivery-policy.json
.duaer/active-job.json
.duaer/specs/<nnn-slug>/
  spec.md         # Brief
  plan.md
  tasks.md
  delivery.json   # accepted | open
```

## Related

- Agent ops: [`AGENTS.md`](AGENTS.md)
- Maintainer notes: [`docs/maintaining.md`](docs/maintaining.md)
