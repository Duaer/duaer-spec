Round: 1
Commit: 2c4c58da8a2f77c05188efc5cfc798ccc87fc1fb

What this change does: Release prep only. `package.json` goes from 0.27.9 to 0.27.10 (patch, per the project's version rule), and the Unreleased note about handoff no longer restarting the FDE desk moves under a `0.27.10` heading. No code.

Checked: the note matches what shipped on develop (empty handoff commands, rules say never start or restart the desk on handoff); Unreleased is left empty; `npm pack` reports 0.27.10; `npm test` 297 pass.

Looks good. Ship.

Verdict: Ship.
