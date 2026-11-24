Round: 2
Commit: d4b8ca02d8520904d511d318f93efc54085f8952

What this change does: Docs only. README (en, zh-CN) adds the review gate and PR mode to the editor section and the employee steps; ADOPT lists the hook files and `pr.json`; CHANGELOG notes it.

Round 1 #1 fixed: the README now says `duaer check` keeps an unreviewed job open everywhere, and only Claude Code is named for the stop hook.

Checked: every claim matches shipped behavior (review rounds 2, CI rounds 3, `pr.json` shape, hook files merged and kept, auto-merge done by the employee via `gh pr merge`); English docs have no Chinese; `npm test` 294 pass; `npm pack` ships `.duaer/hooks/review-gate.mjs` and `pr-gate.mjs`.

Looks good. Ship.

Verdict: Ship.
