# duaer-spec

**Duaer** turns AI coding agents into **digital employees**: they take a normal
language ask, run Spec → work → accept themselves, and only claim a job done
when the handoff is clean.

You should **not** have to operate the workflow. After a one-time install, you
talk; the employee runs the process.

## One-time install

```bash
npx duaer-spec init --here
```

Then use Cursor as usual — describe what you want. No slash-command chain
required.

## What the employee does (by itself)

1. Writes a Brief (Spec) for the ask  
2. Implements within that Brief  
3. Checks the result and stamps accept / still-open  
4. Tells you in one line whether the job is ready for review  

Step skills and CLI checks exist for agents and power users — not as the
everyday human UI.

## Optional

```bash
npx duaer-spec@0.5.0 init --here --method   # method only
```

Details: [`ADOPT.md`](ADOPT.md) · Method: [`DUADER.md`](DUADER.md) · Ops: [`AGENTS.md`](AGENTS.md)

When agent ops and method conflict, **agent ops win**.
