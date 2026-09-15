# Duaer methodology

Treat AI coding agents as **digital employees**. Everyday path is short; the
full chain exists when you need it.

**Precedence:** [`AGENTS.md`](AGENTS.md) wins on isolation, commits, Issue/PR.

## Everyday (default)

```text
/duaer-do <ask>     →  duaer status
```

`/duaer-do` assigns a Brief, implements, converges, and reports handoff.
Do not require the user to run every phase skill.

## Full path (optional)

1. `/duaer-specify` — Brief  
2. `/duaer-plan` — when architecture/contracts change  
3. `/duaer-tasks` — explicit checkbox breakdown  
4. `/duaer-implement` — code from tasks  
5. `/duaer-converge` — accept stamp (`delivery.json`)  
6. `duaer status` — may we claim this job done?

Hotfix: short Spec → tasks → implement → converge (or just `/duaer-do`).

Never skip a Brief or an accept step. Under default **coach** policy, do not
claim "done" while `duaer status` is unfinished. This is **job handoff**, not a
git merge lock.

## Install

```bash
npx duaer-spec init --here
```

See [`ADOPT.md`](ADOPT.md).

## Layout

```text
.duaer/delivery-policy.json   # default coach — usually ignore
.duaer/active-job.json        # current job
.duaer/specs/<nnn-slug>/
  spec.md
  tasks.md
  delivery.json
```

## Related

- Agent ops: [`AGENTS.md`](AGENTS.md)
- Maintainer notes: [`docs/maintaining.md`](docs/maintaining.md)
