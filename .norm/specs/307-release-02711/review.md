Round: 1
Commit: deddb42ecb506a79355cfa8d0825c1f03873be0a

What this change does: Release prep only. `package.json` goes from 0.27.10 to 0.27.11 (patch, per the project's version rule), and the Unreleased notes about the rename to Norm move under a `0.27.11` heading. No code.

Checked: the notes match what is on develop (package `ainorm`, CLI `norm`, aliases, migration); Unreleased is left empty; `npm pack --dry-run` reports `ainorm` 0.27.11; `npm test` 302 pass, `npm run test:live` pass.

Looks good. Ship.

Verdict: Ship.
