# Duaer methodology

**duaer-spec** owns this method. Artifacts live under `.duaer/`; Cursor skills
are `duaer-*` at `.cursor/skills/`.

**Precedence:** root [`AGENTS.md`](AGENTS.md) / [`docs/agent/`](docs/agent/) win
over anything here for isolation, commits, and Issue/PR gates.

## Read before work

1. `.duaer/memory/constitution.md` — process principles
2. `.duaer/memory/project-context.md` — as-is implementation truth
3. `.duaer/memory/testing.md` — verification expectations
4. Active feature under `.duaer/specs/<nnn-slug>/` when one exists

## Standard path

**Full (recommended):**

1. `/duaer-constitution` — only when principles change
2. `/duaer-specify` — what / why / acceptance (not stack trivia)
3. `/duaer-clarify` — optional
4. `/duaer-plan` — technical plan aligned with project-context
5. `/duaer-checklist` — optional quality checklist
6. `/duaer-tasks` — checkbox task breakdown
7. `/duaer-analyze` — optional consistency check
8. `/duaer-implement` — implement tasks only
9. `/duaer-converge` — compare result to spec; append remaining tasks if gaps

**Small feature:** specify → plan → tasks → implement → converge  

**Hotfix:** specify (mark hotfix) → tasks → implement → converge  
Never skip specify or converge.

## Install

```bash
npx github:fujiezee/duaer-spec duaer init --here
```

Or see [`ADOPT.md`](ADOPT.md). No third-party Spec CLI is required — `duaer`
installs this repository's method files into the target project.

## Feature directory shape

```text
.duaer/specs/<nnn-slug>/
  spec.md
  plan.md      # after /duaer-plan
  tasks.md     # after /duaer-tasks
  …            # research / contracts as needed
```

## Related

- Agent ops: [`AGENTS.md`](AGENTS.md)
- Maintainer notes: [`docs/maintaining.md`](docs/maintaining.md)
