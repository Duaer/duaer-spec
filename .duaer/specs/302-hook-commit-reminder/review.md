Round: 1
Commit: c15a5baf29633c8fb6294b330fa2527efce09fcd

What this change does: `duaer init` / `update` now end with the exact `git add` / `git commit` lines when the Claude review hook files are not committed, and `duaer check` warns about the same thing and about a settings file without the hook. Warnings never fail the check. Load assumed: one person running the CLI.

**Must fix**

1. **Ops-only installs get a false warning on every check** (`bin/duaer.mjs` `checkReviewHooks`)
   - **What this is:** `duaer check` warns when `.claude/settings.json` has no review hook.
   - **Problem:** `init --ops` never installs the hook (it is part of the method install), so those projects are told to "run duaer update" on every check, and the update does not add it either.
   - **Fix:** Skip the hook warnings when `.duaer/hooks/review-gate.mjs` is absent; a method install missing that file is already reported as MISS.
   - **If we skip it:** Ops-only users see a warning they cannot clear.

**Nice to have**

2. **Paths are repo-root relative** (`uncommittedHookFiles`)
   - **What this is:** The reminder prints paths from `git status --porcelain`.
   - **Problem:** When duaer is installed in a subfolder of a bigger repo, those paths are relative to the repo root, not the folder, so the printed `git add` line needs adjusting.
   - **Fix:** Leave it; installs are at the repo root (`init --here`). Revisit if subfolder installs show up.
   - **If we skip it:** A rare monorepo user edits one path by hand.

Verdict: fix 1 first.
