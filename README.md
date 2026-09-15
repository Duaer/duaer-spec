# MyDesk / Spec Kit Dev Standards

Reusable AI development standards:

1. **MyDesk agent workflow** — `AGENTS.md`, delivery checklist, Cursor rules
2. **GitHub Spec Kit** — Spec → Plan → Tasks → Implement drop-in scaffold

## Layout

| Path | Contents |
|---|---|
| [`AGENTS.md`](AGENTS.md) | MyDesk-style agent rules |
| [`docs/spec/06-delivery/`](docs/spec/06-delivery/) | AI workflow + change checklist |
| [`.cursor/rules/`](.cursor/rules/) | Condensed Cursor rules (MyDesk) |
| [`spec-kit/`](spec-kit/) | **Portable Spec Kit** (`.specify/`, skills, `SPECKIT.md`) |
| [`examples/dianwu-flow/`](examples/dianwu-flow/) | DianWu Flow Spec Kit conventions (product-specific) |
| [`upstream/github-spec-kit/`](upstream/github-spec-kit/) | Official Spec Kit templates + README snapshot |

## Spec Kit (recommended for new work)

Copy into a project:

```bash
rsync -a spec-kit/.specify/ /path/to/project/.specify/
rsync -a spec-kit/.cursor/skills/ /path/to/project/.cursor/skills/
mkdir -p /path/to/project/.cursor/rules
cp spec-kit/.cursor/rules/spec-kit.mdc /path/to/project/.cursor/rules/
cp spec-kit/SPECKIT.md /path/to/project/
```

Then edit `.specify/memory/constitution.md` and `project-context.md` for that product.

Default loop: **specify → plan → tasks → implement → converge**  
Hotfix: **specify (hotfix) → tasks → implement → converge**

See [`spec-kit/SPECKIT.md`](spec-kit/SPECKIT.md). Official upstream: https://github.com/github/spec-kit

## MyDesk agent rules

See earlier sections / [`SOURCE.md`](SOURCE.md). Keep root `AGENTS.md` short when adapting; prefer Spec Kit for *what* to build and `AGENTS.md` for *how agents operate*.

## Note on branch policy

- MyDesk `AGENTS.md`: merge short-lived work into local `main`
- DianWu Flow Spec Kit example: `develop` / `feat/*` / `fix/*`

Pick one per project and keep Spec Kit + git rules aligned.
