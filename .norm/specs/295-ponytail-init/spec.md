# Feature Specification: Init installs Ponytail skills

## Goal

`duaer init` and `duaer update` copy the packaged Ponytail skills into the target project's `.claude/skills/`.

## Acceptance

1. `duaer init <dir> --method` writes `.claude/skills/ponytail/SKILL.md` and `.claude/skills/ponytail-review/SKILL.md`, matching the package texts.
2. `duaer update` refreshes those files (it re-runs init with `--force`).
3. `package.json` is `0.27.6`. Tag `v0.27.6` is on `main`. npm `duaer-spec` latest is `0.27.6`.
