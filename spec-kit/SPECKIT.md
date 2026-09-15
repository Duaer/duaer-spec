# Spec Kit iteration conventions

This kit is based on [GitHub Spec Kit](https://github.com/github/spec-kit)
(plus Cursor `speckit-*` skills), adapted as a reusable drop-in for other
repositories.

## Read before work (order)

1. `.specify/memory/constitution.md` — process principles
2. `.specify/memory/project-context.md` — as-is implementation truth
3. `.specify/memory/testing.md` — verification expectations
4. Active feature under `.specify/specs/<nnn-slug>/` when one exists

## Standard path

**Full (recommended for production changes):**

1. `/speckit-constitution` — only when principles change
2. `/speckit-specify` — what / why / acceptance (not stack trivia)
3. `/speckit-clarify` — optional
4. `/speckit-plan` — technical plan aligned with project-context
5. `/speckit-checklist` — optional quality checklist
6. `/speckit-tasks` — checkbox task breakdown
7. `/speckit-analyze` — optional consistency check
8. `/speckit-implement` — implement tasks only
9. `/speckit-converge` — compare result to spec; add tasks if gaps remain

**Small feature:** `specify` → `plan` → `tasks` → `implement` → `converge`

**Hotfix (Spec still required):** `specify` (mark hotfix) → `tasks` → `implement` → `converge`

## Install into a project

```bash
# From this standards repo root
rsync -a spec-kit/.specify/ /path/to/project/.specify/
rsync -a spec-kit/.cursor/skills/ /path/to/project/.cursor/skills/
cp spec-kit/.cursor/rules/spec-kit.mdc /path/to/project/.cursor/rules/
cp spec-kit/SPECKIT.md /path/to/project/
# Edit .specify/memory/* for that product
```

Or initialize with the official CLI, then overlay these conventions:

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init --here
```

CLI: `specify` (`uv tool install specify-cli` or via `uvx`). Verify with
`specify version` / `specify check`.
