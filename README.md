# duaer-spec

**Duaer** is a delivery operating system for AI coding agents treated as
**digital employees**.

Agents write the code. Duaer makes the **handoff controllable**: every job has a
Brief (Spec), follows a fixed work order, and only counts as done after
acceptance — not after a lucky chat.

Cursor is the labor. Duaer is hire → assign → accept.

## Install (onboard the employee)

```bash
npx duaer-spec init --here
# or pin: npx github:fujiezee/duaer-spec@v0.1.0 duaer init --here
```

```bash
# Lite: method only (personal / small changes)
npx duaer-spec init --here --method

# Full ops on another integration branch
npx duaer-spec init --here --ops --branch develop
```

Verify: `npx duaer-spec check .`  
Details: [`ADOPT.md`](ADOPT.md)

## How you run them

| Step | Meaning | Command |
|---|---|---|
| **Hire** | Install SOP + gates into the repo | `duaer init` |
| **Assign** | Write the Brief (what / why / acceptance) | `/duaer-specify` |
| **Work** | Plan, break down, implement | `/duaer-plan` → `/duaer-tasks` → `/duaer-implement` |
| **Accept** | Compare result to Spec; gaps become more work | `/duaer-converge` + `duaer check` |

Never skip **Assign** or **Accept**. Hotfix may shorten the middle; Spec and
converge stay.

## Two layers

| Layer | Role | Where |
|---|---|---|
| **Agent ops** | How the employee is allowed to operate | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Duaer method** | What to build (Spec → Plan → Tasks → Implement → Converge) | [`DUADER.md`](DUADER.md), [`.duaer/`](.duaer/), [`.cursor/skills/`](.cursor/skills/) |

When they conflict, **agent ops win** — process beats improvisation.

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
AGENTS.md                 Agent-ops contract (how employees operate)
DUADER.md                 Methodology conventions (how work is briefed)
ADOPT.md                  Onboarding guide
.duaer/                   Memory, templates, workflows, scripts
.cursor/rules/            Agent-ops + Duaer rules
.cursor/skills/           duaer-* skills
docs/agent/               Workflow detail + checklists
docs/maintaining.md       How maintainers evolve the method
docs/npm-trusted-publishing.md  npm Trusted Publishing (OIDC) setup
examples/                 Optional product overlays (not defaults)
```

## Defaults (this repo)

- Integration branch: **`main`**
- One request → one branch + one worktree → merge → delete worktree
- Push only when explicitly requested

## Learn more

Method: [`DUADER.md`](DUADER.md) · Agent ops: [`AGENTS.md`](AGENTS.md)
