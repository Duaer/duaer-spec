Round: 1
Commit: 5db52aa660985dde3b0684d14353712af40f08ce

What this change does: Release prep only. `package.json` goes from 0.27.11 to 0.27.12 (patch, per the project's version rule), and the Unreleased notes (npm name `@fujiezee/norm`, dropped bin aliases, L3 no-browser fix) move under a `0.27.12` heading. No code.

Looks good. Ship.

Checked: the diff outside the Brief is the version line and the new heading; Unreleased is left empty; the notes match what is on develop; `npm pack --dry-run` reports `@fujiezee/norm` 0.27.12; `npm test` 302 pass.

Verdict: Ship.
