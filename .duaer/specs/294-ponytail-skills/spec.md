# Feature Specification: Ponytail skills in duaer-spec

## Goal

Ship the Ponytail and Ponytail review skills inside the duaer-spec repo so a Candex or Claude Code session started in this project can load them, then publish 0.27.5.

## Acceptance

1. `.claude/skills/ponytail/SKILL.md` and `.claude/skills/ponytail-review/SKILL.md` are the upstream MIT skill texts. Hooks and the cost band are not added.
2. `package.json` is `0.27.5`. CHANGELOG has a `0.27.5` section and an empty Unreleased section.
3. Tag `v0.27.5` is on `main`. The GitHub Release is published. npm `duaer-spec` latest is `0.27.5`.
