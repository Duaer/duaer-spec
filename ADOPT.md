# Adopt duaer-spec

## Install

```bash
npx duaer-spec init --here
```

## Update

**Global CLI:**

```bash
duaer self-update
```

Or: `npm i -g duaer-spec@latest`. The CLI prints a hint when npm has a newer
release (≤24h cache; `DUAER_NO_UPDATE_CHECK=1` skips).

**Product-repo adapters:**

```bash
npx duaer-spec update
```

Do **not** use `init --here --force` as the everyday refresh. `update` reuses
the mode/branch from `.duaer/duaer-init.json`.

If you customized constitution / baseline / `.duaer/handoff.json` commands,
glance at `git diff` once and keep your overrides.

Ensure the repo has **`main`** and **`develop`**. See
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)
(Chinese: [`README.zh-CN.md`](README.zh-CN.md)).

Then talk in **Cursor** or **Claude Code** in plain language — you do not need
to learn Spec phases or a professional delivery process.

## Options

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops
npx duaer-spec update --method    # rare; usually omit
```

**Supported for day-to-day use:** **Cursor** and **Claude Code** (FDE desk
dispatch also launches only Cursor Agent / Claude Code).

`init` still installs optional adapters for Codex, GitHub Copilot, Windsurf /
Devin, Cline, Continue, Gemini CLI, and Aider — see the file list below.

## What you get

- Autonomous job loop (ask → Brief → **understand** → work → accept)  
- Cursor: `.cursor/rules` + `.cursor/skills`  
- Claude Code: `CLAUDE.md` + `.claude/rules` + `.claude/skills`  
- Codex: `AGENTS.md` + `.agents/skills`  
- Copilot: `.github/copilot-instructions.md`  
- Windsurf / Devin: `.windsurf/rules`, `.devin/rules`  
- Cline: `.clinerules/`  
- Continue: `.continue/rules/`  
- Gemini CLI: `GEMINI.md`  
- Aider: `.aider.conf.yml` → reads `AGENTS.md`  
- `.duaer/handoff.json` + `duaer handoff` after worktree remove  
- Agent ops: `main` / `develop` / `feat` / `fix` + `.worktree/`  
- Verification contract: `.duaer/memory/testing.md` (risk-based checks before accept)  

## Precedence

1. `AGENTS.md`  
2. `DUADER.md` / `.duaer/`  
