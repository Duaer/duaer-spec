# duaer-spec

Standalone AI development standards for Cursor agents. Not tied to any product
codebase.

Two layers, one precedence rule:

| Layer | Role | Path |
|---|---|---|
| **Agent ops** | How agents operate — isolation, commits, Issue/PR gates | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Spec kit** | What to build — Spec → Plan → Tasks → Implement → Converge | [`kit/`](kit/) |

**Conflict rule:** when Spec Kit, `examples/`, or other overlays disagree with
agent ops, **root `AGENTS.md` / `docs/agent/` win**.

## Layout

```text
AGENTS.md                 Agent-ops contract (authoritative)
ADOPT.md                  How to adopt into another repo
LICENSE                   MIT
.cursor/rules/            Condensed Cursor rules (this repo)
docs/
  baseline.md             Baseline placeholder / this-repo defaults
  adr/                    ADR index
  agent/                  Workflow + change checklist + E2E template
kit/                      Portable Spec Kit drop-in
examples/                 Optional product overlays (not defaults)
vendor/github-spec-kit/   Official Spec Kit docs/templates snapshot
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

Details: [`kit/SPECKIT.md`](kit/SPECKIT.md) · Official upstream: https://github.com/github/spec-kit
