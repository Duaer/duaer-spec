# Feature Specification: Enforced Ponytail review gate

## Goal

Once a project has duaer-spec installed, no job counts as accepted until a
Ponytail review of its diff passed. This holds in the FDE desk and in a plain
Cursor / Claude Code chat, and does not rely on the agent remembering.

## In scope

1. Rules and skills: every installed adapter tells the employee to code in
   Ponytail style (full) and to run `ponytail-review` before accept, writing
   `review.md` in the Brief folder. Ponytail skills also install under
   `.cursor/skills/` and `.agents/skills/`.
2. Verdict: `duaer check` / `duaer job` treat `delivery.json` `accepted` as not
   accepted when `review.md` is missing or its verdict is not `Ship`.
   `verify.json` waiver `docs-only` skips review.
3. Agent stop hooks: `init` / `update` merge a Claude Code `Stop` hook
   (`.claude/settings.json`) and a Cursor `stop` hook (`.cursor/hooks.json`)
   that call the shared verdict. They block stop only when the active job
   claims accepted and the review gate fails. Existing hook config is kept.
4. FDE desk: the task pool adds a code-review task after implement work and
   before functional regression, on the last lane. The desk accept gate
   reopens accepted when review fails. Deliverables page shows `review.md`.
5. Fix loop: only **Must fix** findings go back as tasks. At most 2 review
   rounds; after round 2 still failing, stop and flag for a human.
6. Docs (README, live-desk.md, E2E catalog), version `0.27.8`.

## Out of scope

- GitHub PR / CI integration, PR comments.
- A new Reviewer employee role.
- Git `pre-merge-commit` hook.
- Changing the upstream Ponytail skill texts.

## Acceptance

1. Kickoff task pool contains a review task after implement tasks and before regression.
2. With `delivery.json` accepted and `review.md` missing or `Verdict: fix …`, `duaer check --delivery` reports the job not accepted, and the desk gate reopens it.
3. With `Verdict: Ship.` the job passes; with waiver `docs-only` review is skipped.
4. After `duaer init`, Ponytail skills exist in `.claude/skills`, `.cursor/skills`, `.agents/skills`, and both stop hooks are present; pre-existing hook entries survive.
5. The stop hook exits non-blocking when no active job, or job not claimed accepted, or review passed; blocking with a reason otherwise.
6. `npm test` and `npm run test:live` pass. `package.json` is `0.27.8`.
