Round: 1
Commit: 78f1d9fbcf79a754f914d92c8824205424fa1d61

What this change does: Rewords one sentence in the review-gate paragraph of README.md and README.zh-CN.md. It now says the gate also holds when Claude Code or Cursor runs the duaer-spec rules on its own, in the terminal or the editor, without the console. No code changes.

Checked: both languages say the same thing; the claim matches what ships (rules, `duaer check` / `duaer job`, and the Claude Code Stop hook all work without the console).

Looks good. Ship.

Verdict: Ship.
Not checked: whether the Cursor CLI (`agent`) runs the `stop` hook; the sentence relies on the rules and `duaer check` for Cursor either way.
