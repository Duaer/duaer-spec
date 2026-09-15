# Duaer methodology

AI coding agents are **digital employees**. The human states intent; the agent
runs Brief → work → accept. Humans are not the operators of the phase machine.

**Precedence:** [`AGENTS.md`](AGENTS.md) wins on isolation, commits, Issue/PR.

## Human experience

1. One-time install: `npx duaer-spec init --here`  
2. Later refresh: `npx duaer-spec update`  
3. Ongoing: describe work in chat  
4. Review the handoff line (accepted / not yet)

## Agent procedure (autonomous)

Follow `.cursor/skills/duaer-do/SKILL.md` on every product ask — **without**
waiting for a slash invocation:

1. Assign Brief + `active-job.json`  
2. Light `tasks.md` if needed  
3. Implement  
4. Converge → `delivery.json`  
5. One handoff line; never claim done until accepted  

Large jobs may use step playbooks (`duaer-specify`, `duaer-plan`, …) internally.

## Policy

`.duaer/delivery-policy.json` defaults to `coach`. Agents must not claim done
while the active job is unfinished. This is job etiquette, not a git lock.
Humans need not configure it for everyday use.

## Layout

```text
.worktree/feat-<name>/                 # git isolation (full checkout)
  .duaer/active-job.json
  .duaer/specs/<nnn-slug>/             # Brief (≠ worktree folder name)
    spec.md | tasks.md | delivery.json
.cursor/rules/duaer-spec.mdc           # autonomous behavior
.cursor/skills/duaer-do/               # default job loop
```

Worktree and Brief are different layers. Prefer
`.worktree/feat-login/.duaer/specs/002-login/` — not
`.worktree/002-login/.duaer/specs/002-login/`.

## Related

- Adopt: [`ADOPT.md`](ADOPT.md)
- Branches / go-live: [`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)
- Agent ops: [`AGENTS.md`](AGENTS.md)
