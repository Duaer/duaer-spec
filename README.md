# duaer-spec

**Duaer** is a delivery operating system for AI coding agents treated as
**digital employees**.

Agents write the code. Duaer makes the **job handoff controllable**: every job
has a Brief (Spec), follows a fixed work order, and only counts as done when
that **job** is accepted — not after a lucky chat.

Cursor is the labor. Duaer is hire → assign → accept.  
**Not** a git merge lock. Controllability is job etiquette + optional strictness.

## Install (onboard the employee)

```bash
npx duaer-spec init --here
# or pin: npx github:fujiezee/duaer-spec@v0.3.0 duaer init --here
```

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops --branch develop
```

```bash
duaer policy .          # default: coach
duaer job .             # active job handoff status
duaer check .
```

Details: [`ADOPT.md`](ADOPT.md)

## How you run them

| Step | Meaning | Command |
|---|---|---|
| **Hire** | Install SOP into the project | `duaer init` |
| **Assign** | Brief + set active job | `/duaer-specify` |
| **Work** | Plan, break down, implement | `/duaer-plan` → `/duaer-tasks` → `/duaer-implement` |
| **Accept** | Converge stamps `delivery.json` | `/duaer-converge` |
| **Handoff** | See if this job may be reported done | `duaer job .` |

### Policy (job-level)

Stored in `.duaer/delivery-policy.json`:

| Mode | Behavior |
|---|---|
| `off` | Record only |
| `coach` | **Default** — guide; do not claim "done" until accepted |
| `strict` | Refuse to report done; `duaer check --strict` exits 1 on unfinished job |

Scope is the **active job** (`.duaer/active-job.json`), not every historical feature.
Git commit/merge is never blocked by default.

## Two layers

| Layer | Role | Where |
|---|---|---|
| **Agent ops** | How the employee may operate | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Duaer method** | What to build | [`DUADER.md`](DUADER.md), [`.duaer/`](.duaer/), skills |

When they conflict, **agent ops win**.

## Default loop

```text
constitution → specify → plan → tasks → implement → converge → duaer job
```

Slash skills: `/duaer-specify`, `/duaer-plan`, `/duaer-tasks`, `/duaer-implement`,
`/duaer-converge`, …

## Layout

```text
bin/duaer.mjs                  CLI (init | check | job | policy | version)
.duaer/delivery-policy.json    off | coach | strict
.duaer/active-job.json         current job pointer
.duaer/specs/<feature>/        Brief + tasks + delivery.json
```

## Learn more

Method: [`DUADER.md`](DUADER.md) · Agent ops: [`AGENTS.md`](AGENTS.md)
