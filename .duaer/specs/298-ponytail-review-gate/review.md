Round: 1
Commit: 8f3248764c9b37b7700e4ffc90907eae9df8b67f

What this change does: A job stamped accepted now only counts when the Brief's review.md says `Verdict: Ship.` for the current code. One shared module (`.duaer/hooks/review-gate.mjs`) decides this; `duaer check` / `duaer job`, new Claude Code and Cursor stop hooks (merged in by `duaer init`), and the FDE desk all use it. The desk task pool gets a review task before the accept stamp. Load assumed: one person, one local desk polling every 3 s.

**Must fix**

1. **A revision gets no second chance at review** (`.duaer/hooks/review-gate.mjs` `reviewInstructions`)
   - **What this is:** When review fails, the agent is told which round number to write next. At round 2 a failing review counts as "stuck" and the desk stops nudging.
   - **Problem:** After a job ships with `Round: 2` and the user asks for a revision, the code changes and the gate says "stale". The instructions then say `Round: 2` again (`Math.max(round, 1)`). The first failing review of the revision is already "stuck", so the fix loop never runs.
   - **Fix:** A stale review starts a new cycle: `const next = status.result === "fix" ? status.round + 1 : 1`.
   - **If we skip it:** Every revision of a job that once needed two rounds goes straight to "needs a human".

**Should fix**

2. **The desk reopen has no test** (`bin/duaer-live.mjs` `dispatchStatus`, review block)
   - **What this is:** When verify passes but review fails, the desk rewrites delivery.json to `open` and queues a nudge.
   - **Problem:** This writes the stamp file, and no test runs it. A typo in the condition (for example the `stuck` branch) would ship silently.
   - **Fix:** Move the block into a small pure function in `bin/live-verify-gate.mjs` (delivery + review status in, new delivery / gate / nudge out) and test it; `dispatchStatus` only writes the file.
   - **If we skip it:** A regression in the desk gate is found only by a user whose job never reopens.

**Nice to have**

3. **Doc comment moved off its function** (`bin/live-modules.mjs:292-299`)
   - **What this is:** `REVIEW_TASK_TITLE` was inserted between `buildBugTaskPool`'s JSDoc and the function.
   - **Problem:** Editors now show the bug-pool description on the constant.
   - **Fix:** Move the constant above the JSDoc block.
   - **If we skip it:** Only hover docs are wrong.

Verdict: fix 1 and 2 first.
Not checked: Cursor's live hook runner (format follows Cursor's documented `hooks.json` / `followup_message`); Windows shells for `$CLAUDE_PROJECT_DIR`.
