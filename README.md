# duaer-spec

**Duaer** is a Spec-Driven Development methodology for AI coding agents
(Cursor first), plus enforceable **agent ops** for isolation, commits, and
Issue/PR gates.

Not a wrapper around another toolkit. The method, directories, skills, and rules
in this repository **are** duaer-spec.

## Two layers

| Layer | Role | Where |
|---|---|---|
| **Agent ops** | How agents operate | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Duaer method** | What to build (Spec → Plan → Tasks → Implement → Converge) | [`DUADER.md`](DUADER.md), [`.duaer/`](.duaer/), [`.cursor/skills/`](.cursor/skills/) |

When they conflict, **agent ops win**.

## Default loop

```text
constitution → specify → plan → tasks → implement → converge
```

Small change: `specify → plan → tasks → implement → converge`  
Hotfix: `specify (hotfix) → tasks → implement → converge`

Slash skills: `/duaer-specify`, `/duaer-plan`, `/duaer-tasks`, `/duaer-implement`,
`/duaer-converge`, …

## Layout

```text
AGENTS.md                 Agent-ops contract
DUADER.md                 Methodology conventions
ADOPT.md                  Install into another repository
LICENSE                   MIT
.duaer/                   Memory, templates, workflows, scripts
.cursor/rules/            Agent-ops + Duaer rules
.cursor/skills/           duaer-* skills
docs/agent/               Workflow detail + checklists
docs/maintaining.md       How maintainers evolve the method
examples/                 Optional product overlays (not defaults)
SOURCE.md                 Historical provenance only
```

## Defaults (this repo)

- Integration branch: **`main`**
- One request → one branch + one worktree → merge → delete worktree
- Push only when explicitly requested

## Quick start

Copy into a project: see [`ADOPT.md`](ADOPT.md).  
Method details: [`DUADER.md`](DUADER.md).
