Round: 2
Commit: 280e6e97356138e94cbfc6005ef3d4a0095553ba

What this change does: `duaer init` / `update` end with the exact `git add` / `git commit` lines when the Claude review hook files are not committed, and `duaer check` warns about uncommitted hook files and a settings file without the hook. Warnings never fail the check. Load assumed: one person running the CLI.

Round 1 #1 fixed: no hook warnings when the review hook is not installed (ops-only); tested. #2 (repo-root paths for subfolder installs) left as is; installs are at the repo root.

Checked: reminder only for method / all installs; staged-but-uncommitted files still listed (`git status` shows them); outside git no reminder and no error; after commit `update` and `check` are quiet. `npm test` 297 pass, `npm run test:live` pass.

Looks good. Ship.

Verdict: Ship.
