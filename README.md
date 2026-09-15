# duaer-spec

Reusable AI development standards for Cursor agents.

Two layers, one precedence rule:

| Layer | Role | Path |
|---|---|---|
| **Agent ops (MyDesk)** | How agents operate — isolation, commits, Issue/PR gates | [`AGENTS.md`](AGENTS.md), [`docs/agent/`](docs/agent/) |
| **Spec kit** | What to build — Spec → Plan → Tasks → Implement → Converge | [`kit/`](kit/) |

**Conflict rule:** when Spec Kit conventions, examples, or product kits disagree with MyDesk agent ops, **MyDesk / root `AGENTS.md` wins**.

## Layout

```text
AGENTS.md                 MyDesk agent rules (authoritative ops)
.cursor/rules/            Condensed Cursor rules
docs/
  baseline.md             Placeholder for a target project's frozen decisions
  adr/                    ADR index placeholder
  agent/                  AI workflow + change checklist
kit/                      Portable Spec Kit drop-in
examples/dianwu-flow/     Product-specific Spec Kit conventions (example)
vendor/github-spec-kit/   Official Spec Kit docs/templates snapshot
SOURCE.md                 Upstream provenance
```

## Install Spec Kit into a project

```bash
rsync -a kit/.specify/ /path/to/project/.specify/
rsync -a kit/.cursor/skills/ /path/to/project/.cursor/skills/
mkdir -p /path/to/project/.cursor/rules
cp kit/.cursor/rules/spec-kit.mdc /path/to/project/.cursor/rules/
cp kit/SPECKIT.md /path/to/project/
```

Then edit `.specify/memory/constitution.md` and `project-context.md` for that product.

Default loop: **specify → plan → tasks → implement → converge**  
Hotfix: **specify (hotfix) → tasks → implement → converge**

Copy root [`AGENTS.md`](AGENTS.md) (or adapt it) for *how* agents operate. Keep Spec Kit for *what* to build. Align branch policy with the target repo — this standards repo follows MyDesk (`main` + request worktrees).

See [`kit/SPECKIT.md`](kit/SPECKIT.md). Official upstream: https://github.com/github/spec-kit

## Branch policy note

- **This repo / MyDesk-style:** short-lived branch → merge into local `main`
- **DianWu Flow example:** `develop` / `feat/*` / `fix/*`

Pick one per product; Spec Kit git helpers must match that choice.
