# Adopt Norm

## Install

```bash
npx ainorm init --here
```

## Update

**Global CLI:**

```bash
norm self-update
```

Or: `npm i -g ainorm@latest`. The CLI prints a hint when npm has a newer
release (≤24h cache; `NORM_NO_UPDATE_CHECK=1` skips).

**Product-repo adapters:**

```bash
npx ainorm update
```

Do **not** use `init --here --force` as the everyday refresh. `update` reuses
the mode/branch from `.norm/norm-init.json`.

If you customized constitution / baseline / `.norm/handoff.json` commands,
glance at `git diff` once and keep your overrides.

Ensure the repo has **`main`** and **`develop`**. See
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)
(Chinese: [`README.zh-CN.md`](README.zh-CN.md)).

Then talk in **Cursor** or **Claude Code** in plain language — you do not need
to learn Spec phases or a professional delivery process.

## Options

```bash
npx ainorm init --here --method
npx ainorm init --here --ops
npx ainorm update --method    # rare; usually omit
```

**Supported for day-to-day use:** **Cursor** and **Claude Code** (FDE desk
dispatch also launches only Cursor Agent / Claude Code).

`init` still installs optional adapters for Codex, GitHub Copilot, Windsurf /
Devin, Cline, Continue, Gemini CLI, and Aider — see the file list below.

## What you get

- Autonomous job loop (ask → Brief → **understand** → work → accept)  
- Cursor: `.cursor/rules` + `.cursor/skills`  
- Claude Code: `CLAUDE.md` + `.claude/rules` + `.claude/skills` (includes Ponytail and Ponytail review)  
- Codex: `AGENTS.md` + `.agents/skills` (also Ponytail; Cursor gets them under `.cursor/skills`)  
- Review gate: `.norm/hooks/review-gate.mjs`, merged as a stop hook into `.claude/settings.json` and `.cursor/hooks.json` (existing entries kept). Commit both files so request worktrees have the hook  
- Optional PR mode: create `.norm/memory/pr.json` with `{ "enabled": true, "base": "develop" }` (needs `gh` logged in); see `docs/agent/branching-and-release.md` § PR mode  
- Copilot: `.github/copilot-instructions.md`  
- Windsurf / Devin: `.windsurf/rules`, `.devin/rules`  
- Cline: `.clinerules/`  
- Continue: `.continue/rules/`  
- Gemini CLI: `GEMINI.md`  
- Aider: `.aider.conf.yml` → reads `AGENTS.md`  
- Method skeleton under `.norm/` (`memory`, `templates`, `extensions`, `integrations`, `scripts`, `workflows`) and an empty `.norm/specs/` for this project's jobs. Brief history of Norm stays in the Norm repository  
- `.norm/handoff.json` + `norm handoff` after worktree remove  
- Agent ops: `main` / `develop` / `feat` / `fix` + `.worktree/`  
- Verification contract: `.norm/memory/testing.md` (risk-based checks before accept)  

## Precedence

1. `AGENTS.md`  
2. `NORM.md` / `.norm/`  
