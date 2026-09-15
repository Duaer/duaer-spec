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
   (assign Brief → light tasks → implement → converge → handoff line).
2. Do **not** wait for `/duaer-do` or any other skill invocation.
3. Do **not** say “please run `/duaer-specify`” — you do it.
4. Do **not** dump a methodology tutorial unless they ask how Duaer works.
5. Merge to **`develop`** when done (hotfix: **`main`**, then back-merge
   **`develop`**). Promote to **`main`** only if the user asks to go online.
6. **Handoff (mandatory):** stop processes bound to `.worktree/<id>/`, remove
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
- Making the human operate the workflow.

## Optional finer tools (agent-only)

Step skills (`duaer-specify`, `duaer-plan`, …) are **your** playbooks when a
job is large. The human should not need to know they exist.
