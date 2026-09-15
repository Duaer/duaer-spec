# Adopt duaer-spec

Install Duaer so agents act like digital employees with a simple everyday loop.

## Install

```bash
npx duaer-spec init --here
# pin: npx github:fujiezee/duaer-spec@v0.4.0 duaer init --here
```

```bash
npx duaer-spec init --here --method          # lite
npx duaer-spec init --here --ops --branch develop
```

## Everyday use

1. `/duaer-do <ask>` in Cursor  
2. `duaer status` when you want to see if the job is accepted  

No need to learn policy modes or the full skill chain for normal work.

## Finer control (optional)

| Command | When |
|---|---|
| `/duaer-specify` | Only write / reshape the Brief |
| `/duaer-plan` · `/duaer-tasks` | Large or architectural jobs |
| `/duaer-implement` | Resume coding from `tasks.md` |
| `/duaer-converge` | Re-check Spec vs code |
| `duaer policy . strict` | Harder “don’t claim done” (still not a git lock) |

## Precedence

1. `AGENTS.md` — how employees operate  
2. `DUADER.md` / `.duaer/` — what to build  

## Updates

`duaer init --force` (review the diff) or pin a tag. No auto-update.

## Do not copy

`examples/`, `SOURCE.md`, `bin/` / `package.json` (unless vendoring the CLI)
