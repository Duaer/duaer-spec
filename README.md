# duaer-spec

Standalone AI development standards for Cursor agents. Not tied to any product
codebase.

Two layers, one precedence rule:

| Layer | Role | Path |
|---|---|---|
| **Agent ops** | How agents operate — isolation, commits, Issue/PR gates | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Spec Kit** | What to build — Spec → Plan → Tasks → Implement → Converge | [`SPECKIT.md`](SPECKIT.md), [`.specify/`](.specify/), [`.cursor/skills/`](.cursor/skills/) |

**Conflict rule:** when Spec Kit, `examples/`, or other overlays disagree with
agent ops, **root `AGENTS.md` / `docs/agent/` win**.

## Layout

```text
AGENTS.md                 Agent-ops contract (authoritative)
SPECKIT.md                Spec Kit conventions
ADOPT.md                  How to adopt into another repo
LICENSE                   MIT
.specify/                 Spec Kit memory, templates, workflows
.cursor/rules/            Agent-ops + Spec Kit Cursor rules
.cursor/skills/           speckit-* skills
docs/
  baseline.md             Baseline placeholder / this-repo defaults
  adr/                    ADR index
  agent/                  Workflow + change checklist + E2E template
  maintaining.md          Upstream Spec Kit sync / promote
examples/                 Optional product overlays (not defaults)
vendor/github-spec-kit/   Official Spec Kit docs/templates snapshot
scripts/                  Maintainer tooling
SOURCE.md                 Historical provenance only
```

## Defaults for this repository

- Integration branch: **`main`**
- One request → one branch + one worktree → merge back → delete worktree
- Push only when explicitly requested
- Spec Kit optional for standards-doc edits; recommended for process changes that need acceptance criteria

`examples/` may document other git policies (for example `develop`). Those apply
only inside that example's target product, never to duaer-spec itself.

## Quick start

Adopt into a project: see [`ADOPT.md`](ADOPT.md).

Spec Kit loop: **specify → plan → tasks → implement → converge**  
Hotfix: **specify (hotfix) → tasks → implement → converge**

Details: [`SPECKIT.md`](SPECKIT.md) · Official upstream: https://github.com/github/spec-kit

Keep Spec Kit fresh: [`docs/maintaining.md`](docs/maintaining.md) (weekly CI + `node scripts/sync-upstream-spec-kit.mjs`).
