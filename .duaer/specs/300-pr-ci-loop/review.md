Round: 1
Commit: 570b3de58b5dc1cb5e14307cf3bbea9338835d69

What this change does: Adds an opt-in PR mode (`.duaer/memory/pr.json`). When on, a job counts as accepted only when its GitHub PR is merged; `duaer check` / `duaer job`, the stop hooks and the desk read the PR through `gh` (`.duaer/hooks/pr-gate.mjs`) and tell the employee the next step. Also fixes the stop hook missing desk-dispatched jobs. Load assumed: one person; the stop hook runs at the end of every agent turn; the desk polls every 3 s.

**Must fix**

1. **A merged job looks "stale" on develop** (`.duaer/hooks/review-gate.mjs` `codeMatches`)
   - **What this is:** The review is current only if the code equals the reviewed commit.
   - **Problem:** Jobs A and B branch from develop. A merges first, then B. On develop the tree now holds A's code too, so B's review counts as stale. `duaer check` on develop says "review again", and the stop hook blocks every turn in the primary checkout. This also affects the review gate from 0.27.8, in local merge mode.
   - **Fix:** Only check staleness on the job's own branch (current branch equals the job branch). On any other branch, check only the verdict.
   - **If we skip it:** After any parallel merge, every agent turn on develop gets sent back to re-review a job that is already merged.

2. **CI rounds leak across revisions** (`.duaer/hooks/pr-gate.mjs` `prStatus`, `gh run list --branch`)
   - **What this is:** Rounds are the distinct commits with a failed CI run.
   - **Problem:** A revision reuses the branch name. If revision 1 had 2 failed rounds, revision 2's first failure counts as round 3, which is "stuck" at once.
   - **Fix:** Count only runs whose `headSha` is one of the PR's own commits (`gh pr view --json commits`).
   - **If we skip it:** Later revisions skip the fix loop and wait for a human.

3. **The stop hook calls GitHub on every turn and blocks offline** (`jobGate` via `claimedJobs`)
   - **What this is:** After merge the job stays the active, accepted job until the next one starts.
   - **Problem:** Each agent turn then runs two `gh` calls (slow). Offline, the call fails, the state is "error", and the hook blocks the turn with "cannot read PR state".
   - **Fix:** Once `gh` confirms the PR merged for a url, record it in the Brief (`pr-gate.json`) and skip `gh` after that. The hook treats "error" like "stuck" and stays quiet; the CLI still reports it.
   - **If we skip it:** Every turn is slower in PR-mode projects, and offline work is blocked.

Verdict: fix 1, 2 and 3 first.
Not checked: a real GitHub repo (tests use a fake `gh` with real `gh` JSON field names).
