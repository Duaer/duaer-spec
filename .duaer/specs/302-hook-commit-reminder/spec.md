# Feature Specification: Remind to commit the Claude review hook

## Goal

Request worktrees branch from git, so the Claude Code review stop hook only
runs there once `.claude/settings.json` and `.duaer/hooks/*.mjs` are
committed. Make that visible instead of silent. Claude Code only.

## In scope

1. `duaer init` / `update` end with a reminder and the exact `git add` /
   `git commit` lines when those files are untracked or changed.
2. `duaer check` (workplace) warns when `.claude/settings.json` lacks the
   review stop hook, or a hook file is not committed. Warnings never fail.

## Out of scope

Codex and Cursor hooks; committing on the user's behalf.

## Acceptance

1. Fresh `init` in a git repo prints the reminder listing the uncommitted files.
2. `duaer check --workplace` warns per uncommitted file and still exits 0; after commit, no warnings and `update` prints no reminder.
3. Settings without the hook → warning says to run `duaer update`.
4. Outside git: no reminder, no error.
