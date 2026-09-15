# Adopt duaer-spec

Install once so the coding agent behaves as a **digital employee**: it runs
Brief → work → accept **without** the human operating slash commands or CLI.

## Install (human, once)

```bash
npx duaer-spec init --here
# pin: npx github:fujiezee/duaer-spec@v0.5.0 duaer init --here
```

```bash
npx duaer-spec init --here --method
npx duaer-spec init --here --ops --branch develop
```

After that: talk to the agent in plain language. Do not teach them `/duaer-*`.

## What gets installed

- Always-on rule: agent must run the autonomous job loop on product work  
- Playbook skill `duaer-do` (agent follows it; human need not invoke it)  
- Optional step skills for large jobs (agent-only)  
- Agent ops (`AGENTS.md`) when using `--all` / `--ops`

## Power users / agents

| Tool | Who uses it |
|---|---|
| `/duaer-do` procedure | Agent (automatic) |
| `/duaer-specify` … `/duaer-converge` | Agent, when splitting a large job |
| `duaer status` / `duaer policy` | Optional diagnostics — not required of humans |

## Precedence

1. `AGENTS.md` — how employees operate  
2. `DUADER.md` / `.duaer/` — how jobs are briefed  

## Updates

`duaer init --force` (review the diff) or pin a tag.
