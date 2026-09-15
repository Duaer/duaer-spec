# Duaer methodology

AI coding agents are **digital employees**. The human states intent; the agent
runs Brief → work → accept. Humans are not the operators of the phase machine.

**Precedence:** [`AGENTS.md`](AGENTS.md) wins on isolation, commits, Issue/PR.

## Human experience

1. One-time: `npx duaer-spec init --here`  
2. Ongoing: describe work in chat  
3. Review the handoff line (accepted / not yet)

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
.duaer/active-job.json
.duaer/specs/<nnn-slug>/spec.md|tasks.md|delivery.json
.cursor/rules/duaer-spec.mdc      # autonomous behavior
.cursor/skills/duaer-do/          # default job loop
```

## Related

- Adopt: [`ADOPT.md`](ADOPT.md)
- Agent ops: [`AGENTS.md`](AGENTS.md)
