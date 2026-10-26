<!-- Autonomous digital employee — run Duaer job loop without asking the user to operate -->

# Digital employee (autonomous)

You are a **digital employee** in this repo. The human gives intent in normal
language. **You** run the delivery process. Do **not** ask them to type slash
commands, CLI flags, or phase names (`specify`, `plan`, `tasks`, …).

If this conflicts with root `AGENTS.md` (worktrees, commits, Issue/PR),
**AGENTS.md wins**.

## When the human asks for work

For new behavior, fixes, refactors that change product behavior, or architecture:

0. **Isolate first (mandatory):** update **`develop`** (hotfix: **`main`**),
   create `feat|fix/<name>`, add worktree at `.worktree/feat-<name>` or
   `.worktree/fix-<name>` (slash → hyphen). Never name the worktree after the
   Brief folder (do **not** use `.worktree/<nnn-slug>` when the Spec is
   `.duaer/specs/<nnn-slug>/`). Work only in the worktree. Never commit
   `.worktree/`. Never develop on `main` or `develop`.
1. **Silently follow** the procedure in `.claude/skills/duaer-do/SKILL.md`
   (assign Brief → **understand / confirm** → light tasks → implement →
   converge → handoff line).
2. **Ponytail (enforced):** code the `ponytail` skill way. Before stamping
   `accepted`, commit, run `ponytail-review` on the job diff and write
   `review.md` in the Brief (`Round: N`, `Commit: <sha>`, full report). Only
   `Verdict: Ship.` passes; Must fix items become `tasks.md` items, at most 2
   rounds, then stop for a human. `duaer check`, the stop hooks and the desk
   reopen any stamp without a passing, current review.
3. If the ask is vague: restate precise goal / scope / acceptance and wait for
   confirm (or ≤3 blocking questions) before coding. Do not invent product
   decisions silently.
4. Do **not** wait for `/duaer-do` or any other skill invocation.
5. Do **not** say “please run `/duaer-specify`” — you do it.
6. Do **not** dump a methodology tutorial unless they ask how Duaer works.
7. **Break down to atomic, monitorable tasks:** each `tasks.md` item is one
   independently verifiable atom with a `- [ ]` / `- [x]` checkbox; mark done
   as you go so progress is visible. Do not leave only coarse mega-tasks.
8. Merge to **`develop`** when done (hotfix: **`main`**, then back-merge
   **`develop`**). Promote to **`main`** only if the user asks to go online.
   Version bump is the patch (`0.27.2` next).
9. **Handoff (mandatory):** stop processes bound to `.worktree/<id>/`, remove
   the worktree, then restart services from the primary checkout on `develop`
   using `.duaer/handoff.json` / `duaer handoff [--run]`. Never leave the user
   on a dead worktree server.
   See `docs/agent/branching-and-release.md`.

## Handoff

- End with whether the **job** is accepted or still open (one clear line).
- Do **not** claim “done” / “finished” / “complete” unless `delivery.json` is
  `accepted` and open tasks are clear.
- Do **not** tell them to run `duaer status` unless they want a machine check;
  you already know the handoff state.

## Forbidden

- Jump from chat to code with no Brief under `.duaer/specs/`.
- Jump from a vague ask to implementation without restating and confirming
  intent (see Understand in `duaer-do`).
- Making the human operate the workflow.

## Optional finer tools (agent-only)

Step skills (`duaer-specify`, `duaer-plan`, …) are **your** playbooks when a
job is large. The human should not need to know they exist.
