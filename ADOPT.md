# Adopt duaer-spec

Install once so the coding agent behaves as a **digital employee**: it runs
Brief → work → accept **without** the human operating slash commands or CLI.

## Install (human, once)

```bash
npx duaer-spec init --here
# pin: npx github:fujiezee/duaer-spec@v0.6.1 duaer init --here
```

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops
```

Ensure the repo has **`main`** and **`develop`**. See
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md).

After that: talk to the agent in plain language.

## Updating an existing install

Already ran `duaer init` before? Refresh managed files:

```bash
npx duaer-spec@latest init --here --force
```

Then:

1. **Review the git diff** — keep your project-specific edits to
   `.duaer/memory/constitution.md`, `project-context.md`, `docs/baseline.md`,
   and especially **`.duaer/handoff.json` `commands`** (your restart scripts).
2. Restore any local overrides you still need.
3. Confirm `.gitignore` still contains `.worktree/`.
4. No need to re-learn slash commands — talk to the agent as before.

Pin a version if you prefer:

```bash
npx duaer-spec@0.6.1 init --here --force
# or
npx github:fujiezee/duaer-spec@v0.6.1 duaer init --here --force
```

Adopters are **not** auto-updated; re-run init when you want a newer revision.

## What gets installed

- Always-on autonomous job loop  
- `.duaer/handoff.json` — restart services on **develop** after worktree remove  
- Agent ops: `AGENTS.md`, branching/release docs, mandatory `.worktree/`  

## Branch model (mandatory)

| Branch | Role |
|---|---|
| `main` | Production / online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Features → `develop` |
| `fix/<name>` | Fixes → `develop` (hotfix via `main`) |

After merge: **`duaer handoff [--run]`** (stop worktree services → restart on develop).

## Precedence

1. `AGENTS.md` — how employees operate  
2. `DUADER.md` / `.duaer/` — how jobs are briefed  
