Round: 1
Commit: f9fe9528f4526a975982b1f587d9199eb148abb8

What this change does: Release prep only. `package.json` goes from 0.27.8 to 0.27.9 (patch, per the project's version rule), and the Unreleased note about the hook commit reminder moves under a `0.27.9` heading. No code.

Checked: the note matches the shipped behavior (reminder on init / update, warnings in `duaer check`, never failing, skipped on ops-only installs); Unreleased is left empty; `npm pack` reports version 0.27.9; `npm test` 297 pass.

Looks good. Ship.

Verdict: Ship.
