Round: 2
Commit: f15e9ae42e8df4e9722b7f9b81007d2bf61cb897

What this change does: Opt-in PR mode (`.duaer/memory/pr.json`). A job counts as accepted only when its GitHub PR is merged; `duaer check` / `duaer job`, the stop hooks and the desk read the PR via `gh` and give the employee the next step (push / open PR / fix CI / answer Request changes / merge). Load assumed: one person; stop hook at every turn end; desk polls every 3 s with a 30 s `gh` cache.

Round 1 findings, now fixed:
- #1 A review goes stale only on the job's own branch. When `active-job.json` names no branch (duaer-specify did not write one; its template now does), `develop` / `main` / `master` are skipped. Tested both ways, including a parallel job landing on develop.
- #2 CI rounds count only runs on the PR's own commits (`gh pr view --json commits`). Tested with earlier-revision runs.
- #3 A merge confirmed by `gh` for the stamped `pr.url` is cached in `pr-gate.json`, so later turns make no network call. A `gh` error is reported by the CLI but does not block the hook. Tested offline with a failing fake `gh`.

Checked again: PR lookup by branch sees only open PRs (a revision cannot pass on the last revision's merged PR); a `pr.url` whose head branch is not the job branch counts as no PR; without `pr.json` no `gh` call happens (tested with `gh` absent); the desk passes the job branch to the review check; dispatch and revise prompts switch merge wording only in PR mode. `npm test` 294 pass, `npm run test:live` pass.

Looks good. Ship.

Verdict: Ship.
Not checked: a real GitHub repo and Actions run (tests use a fake `gh` with the real JSON field names).
