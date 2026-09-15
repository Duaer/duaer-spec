# Adopt duaer-spec

## Install

```bash
npx duaer-spec init --here
```

## Update

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

Then talk to the agent in plain language.

## Options

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops
npx duaer-spec update --method    # rare; usually omit
```

Works with **Cursor** and **Claude Code** (both hosts installed by default).

## What you get

- Autonomous job loop (ask → Brief → work → accept)  
- Cursor: `.cursor/rules` + `.cursor/skills`  
- Claude Code: `CLAUDE.md` + `.claude/rules` + `.claude/skills`  
- `.duaer/handoff.json` + `duaer handoff` after worktree remove  
- Agent ops: `main` / `develop` / `feat` / `fix` + `.worktree/`  

## Precedence

1. `AGENTS.md`  
2. `DUADER.md` / `.duaer/`  
