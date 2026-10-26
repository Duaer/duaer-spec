# Feature Specification: PR + CI merge loop

## Goal

For projects that opt in, a job merges through a GitHub PR instead of a local
merge: push branch → open PR → wait for CI → failures go back to the employee
→ auto-merge when green. A job counts as accepted only when its PR is merged.
Works for FDE dispatch and for an agent running the rules on its own.

## In scope

1. Opt-in config `.duaer/memory/pr.json` (`{ "enabled": true, "base": "develop" }`).
   Enabling it authorizes pushing `feat|fix/*` and opening / merging PRs.
   Absent or disabled: today's local merge, unchanged.
2. Shared PR gate (`.duaer/hooks/pr-gate.mjs`, via `gh`): states none,
   pending, fail, changes (Request changes), ready (green, not merged),
   merged, stuck (CI failing after 3 rounds), error (`gh` missing / failing).
   Rounds = distinct head commits with a failed CI run.
3. Accepted requires PR merged when enabled: `duaer check` / `duaer job`, the
   stop hooks, and the FDE desk reopen otherwise and say what to do next.
4. Employee instructions (rules, `AGENTS.md`, `duaer-do`, desk prompt): after
   review Ship, push, `gh pr create` (Brief goal + acceptance + review in the
   body), watch checks, fix failures / Request-changes items as tasks (max 3
   CI rounds), `gh pr merge --merge --delete-branch` when green, sync local
   base, then stamp with `pr.url` and hand off.
5. Desk: Progress shows the PR state; deliverables page links the PR.
6. Docs, E2E row, CHANGELOG (0.27.8 notes).

## Out of scope

- Notifications / "needs you" lane; GitLab or other hosts; writing CI config.
- The desk merging PRs itself (the employee merges).

## Acceptance

1. Without `pr.json` (or `enabled: false`) behavior is unchanged.
2. With PR mode on and delivery accepted, `duaer check --delivery --strict` fails unless the PR is merged, naming the PR state.
3. PR state parsing covers none / pending / fail / changes / ready / merged / stuck / error.
4. Stop hooks block a claimed accept whose PR is not merged (once), and stay silent when merged.
5. The desk reopens an accept whose PR is not merged and nudges with next steps; stuck stops nudging; Progress shows the state in all locales.
6. `npm test` and `npm run test:live` pass.
