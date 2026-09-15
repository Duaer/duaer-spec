# duaer-spec

**Duaer** is a Spec-Driven Development methodology for AI coding agents
(Cursor first), plus enforceable **agent ops** for isolation, commits, and
Issue/PR gates.

Not a wrapper around another toolkit. The method, directories, skills, and rules
in this repository **are** duaer-spec.

## Install into a project

```bash
npx github:fujiezee/duaer-spec duaer init --here
```

```bash
# method only / ops only / other integration branch
npx github:fujiezee/duaer-spec duaer init --here --method
npx github:fujiezee/duaer-spec duaer init --here --ops --branch develop
```

Verify: `npx github:fujiezee/duaer-spec duaer check .`  
Details: [`ADOPT.md`](ADOPT.md)

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
bin/duaer.mjs             CLI (duaer init | check | version)
package.json              npm package metadata
AGENTS.md                 Agent-ops contract
DUADER.md                 Methodology conventions
ADOPT.md                  Install guide
.duaer/                   Memory, templates, workflows, scripts
.cursor/rules/            Agent-ops + Duaer rules
.cursor/skills/           duaer-* skills
docs/agent/               Workflow detail + checklists
docs/maintaining.md       How maintainers evolve the method
examples/                 Optional product overlays (not defaults)
```

## Defaults (this repo)

- Integration branch: **`main`**
- One request → one branch + one worktree → merge → delete worktree
- Push only when explicitly requested

## Learn more

Method: [`DUADER.md`](DUADER.md) · Agent ops: [`AGENTS.md`](AGENTS.md)
