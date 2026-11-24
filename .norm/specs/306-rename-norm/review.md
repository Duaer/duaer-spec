Round: 1
Commit: f41dfcf5379b9f4a75df18c2109f12f9d5ff8975

What this change does: Renames the product from duaer-spec to Norm everywhere: npm package `ainorm`, CLI `norm`, `.norm/` install folder, `norm-*` skills, `NORM_*` env vars, `~/.norm` home. A new `bin/legacy-names.mjs` keeps old installs working: `DUAER_*` env vars still count, `~/.duaer` moves to `~/.norm`, and `norm init` / `update` move an old repo's `.duaer/` and hook commands over and drop the old `duaer-*` adapter files.

Load assumed: one developer per machine running the CLI and the desk; migrations run once per repo and once per home.

**Must fix**

1. **The desk splits an old repo's state across two folders** (`bin/norm-live.mjs` `ensureNormInstalled`)
   - **What this is:** Before a dispatch, the desk checks that the product repo has Norm installed, and runs `norm init` if not.
   - **Problem:** An old repo still has `.duaer/` and `AGENTS.md`. `hasNormInstall` says yes because `AGENTS.md` exists, so no init and no migration run. The desk then writes the new Brief to `.norm/specs/` and `.norm/active-job.json`. A later `norm update` sees `.norm/` already exists and skips moving `.duaer/`, so all the old job history stays behind in `.duaer/`.
   - **Fix:** Call `migrateLegacyRepo(abs)` at the top of `ensureNormInstalled`, before the install check. One import and one line.
   - **If we skip it:** The first desk dispatch after upgrading strands the repo's Brief history in a folder nothing reads anymore.

Checked: every `.duaer` path in code now has a `.norm` twin; rule file names (`norm.md` / `norm.mdc`) match what `installRuleSet` and `OLD_ADAPTERS` expect; hook commands are rewritten before `installReviewHooks` dedups them (test asserts one hook); `DUAER_*` fallback never overrides a set `NORM_*`; home migration is skipped under `node --test` and never overwrites `~/.norm` entries; `npm test` 301 pass, `npm run test:live` pass.

Verdict: fix 1 first.

Not checked: npm trusted publishing has to be set up for the new `ainorm` package before the release workflow can publish it.
