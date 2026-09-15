# Adopt duaer-spec

## Install

```bash
npx duaer-spec init --here
```

## Update

```bash
npx duaer-spec update
```

That’s it. If you customized local files, glance at `git diff` once.

Ensure the repo has **`main`** and **`develop`**. See
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md).

Then talk to the agent in plain language.

## Options

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops
npx duaer-spec update --method    # rare; usually omit
```

## What you get

- Autonomous job loop (ask → Brief → work → accept)  
- `.duaer/handoff.json` + `duaer handoff` after worktree remove  
- Agent ops: `main` / `develop` / `feat` / `fix` + `.worktree/`  

## Precedence

1. `AGENTS.md`  
2. `DUADER.md` / `.duaer/`  
