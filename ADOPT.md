# Adopt duaer-spec

Install once so the coding agent behaves as a **digital employee**: it runs
Brief → work → accept **without** the human operating slash commands or CLI.

## Install (human, once)

```bash
npx duaer-spec init --here
# pin: npx github:fujiezee/duaer-spec@v0.6.0 duaer init --here
```

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops          # default integration note: develop
```

Ensure the repo has **`main`** and **`develop`**. Agent ops require both, plus
`feat/*` / `fix/*` for work. See
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md).

After that: talk to the agent in plain language. Do not teach them `/duaer-*`.

## What gets installed

- Always-on rule: agent runs the autonomous job loop on product work  
- Playbook skill `duaer-do` (agent follows it; human need not invoke it)  
- Agent ops: `AGENTS.md`, branching/release docs, mandatory `.worktree/`  
- Optional step skills for large jobs (agent-only)

## Branch model (mandatory)

| Branch | Role |
|---|---|
| `main` | Production / online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Features → `develop` |
| `fix/<name>` | Fixes → `develop` (hotfix via `main` then back to `develop`) |

Go-live: promote `develop` → `main` only when you ask to ship.

## Precedence

1. `AGENTS.md` — how employees operate  
2. `DUADER.md` / `.duaer/` — how jobs are briefed  

## Updates

`duaer init --force` (review the diff) or pin a tag.
