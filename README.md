# duaer-spec

**Duaer** makes AI coding agents work like digital employees: assign a job,
get a controllable handoff — without a rigid git lock.

## Everyday (this is enough)

```bash
npx duaer-spec init --here
```

In Cursor, one command:

```text
/duaer-do <what you want built or fixed>
```

See if the job can be reported done:

```bash
duaer status
```

That’s the whole loop: **hire → do → status**.

## What `/duaer-do` does

1. Writes a short Brief (Spec)  
2. Implements it  
3. Checks against the Brief and stamps accept / still-open  

You do **not** need to chain specify → plan → tasks → implement → converge
for normal work. Those remain available when you want finer control.

## Optional

```bash
duaer status          # active job: accepted or not
npx duaer-spec@0.4.0 init --here --method   # method only
```

Advanced (policy, full check, step-by-step skills): [`ADOPT.md`](ADOPT.md) · [`DUADER.md`](DUADER.md)

## Two layers

| Layer | Role |
|---|---|
| **Agent ops** | How agents may operate — [`AGENTS.md`](AGENTS.md) |
| **Duaer method** | How jobs are briefed and accepted — [`.duaer/`](.duaer/), skills |

When they conflict, **agent ops win**.
