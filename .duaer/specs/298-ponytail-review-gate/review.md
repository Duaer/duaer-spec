Round: 2
Commit: 5472199e937a80b8103773b1e5922d6feb2a82df

What this change does: A job stamped accepted only counts when the Brief's review.md says `Verdict: Ship.` for the current code. `.duaer/hooks/review-gate.mjs` decides this for `duaer check` / `duaer job`, the Claude Code and Cursor stop hooks that `duaer init` merges in, and the FDE desk (`reviewGateReopen`). Load assumed: one person, one local desk polling every 3 s.

Round 1 findings, now fixed:
- #1 A stale review restarts at `Round: 1` (`reviewInstructions`), so a revision gets its own two rounds. Tested.
- #2 The desk reopen is the pure `reviewGateReopen` in `bin/live-verify-gate.mjs`, tested for pass / waived / fix / stuck and for not changing its input.
- #3 The JSDoc is back on `buildBugTaskPool`.
- Also found while re-reading: desk nudge fingerprints never reset across revisions, so a second revision going stale at Round 1 would have reused the first one's fingerprint and got no nudge. The fingerprint now includes the review commit. Tested.

Checked again: callers of `installPackagedSkills` (three hosts), `withReviewGate` (check, job), hook merging keeps existing entries and is idempotent on `update`, the stale check ignores `.duaer/` and catches untracked files, revise and deploy rewrite delivery.json from scratch (so no old `review` field leaks into a revision), and the package ships `.duaer/hooks/review-gate.mjs`. `npm test` 285 pass, `npm run test:live` pass.

Looks good. Ship.

Verdict: Ship.
Not checked: Cursor's live hook runner (format follows Cursor's documented `hooks.json` / `followup_message`); Windows shells for `$CLAUDE_PROJECT_DIR`.
