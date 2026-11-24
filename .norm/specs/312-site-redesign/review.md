Round: 1
Commit: 037c48484e1925778a7e5861e1e8697ef93efdfe

What this change does: Rebuilds the static intro page `site/index.html` around what Norm does today, following `README.zh-CN.md`: a sticky section nav, the hero, a five-step delivery flow with the review gate, editor-side capabilities, Norm FDE with a CSS sketch of the three-column desk, the three digital-employee roles, the five deploy targets, and install / update commands. It stays one HTML file with inline CSS, no script, and the same palette tokens. Load assumed: a static page on GitHub Pages; no server code.

Looks good. Ship.

Checked: every section anchor exists once and the nav links to it; all outbound links point at `github.com/fujiezee/norm`, `fujiezee.github.io/norm` or `@fujiezee/norm`, and `duaer` appears only in the rename note; the tag structure balances; headless Chromium at 375px and 1280px gives `scrollWidth == clientWidth` and no element past the right edge outside the nav strip and code blocks; the `.rise` delays match the five hero children, and reduced motion sets them visible with no animation; on phones the deploy rows drop the header row and label the last column; the copy matches README facts (11 UI languages, Ponytail `Ship` gate, PR mode via `.norm/memory/pr.json`, Cursor / Claude Code for dispatch, deploy prerequisites); no test reads `site/`, and `npm test` passes 302 / 302.

Verdict: Ship.

Not checked: Safari and Firefox rendering (only Chromium was run); `backdrop-filter` on the nav falls back to the semi-opaque background where unsupported.
