# Feature Specification: Ensure git + CLI auto-upgrade

**Feature Branch**: `feat/git-cli-ensure`  
**Brief**: `.duaer/specs/082-git-cli-ensure/`  
**Status**: Active

## Goal

1. Before product-repo `git init`, verify **git** is installed; if missing,
   best-effort auto-install, then init.
2. For worker CLIs (Cursor Agent / Claude Code / DeepSeek): **check version**
   and **auto-upgrade at most every 10 days** (on live start + before launch).

## Assumptions

- Install/upgrade without interactive sudo when possible (`brew`, `npm -g`,
  Cursor install script, `claude update`). If not possible, throw a clear
  install hint — never hang on password prompts (`sudo -n` only).
- Opt-out: `DUAER_NO_CLI_UPGRADE=1` skips worker CLI auto-upgrade.
- duaer-spec package itself stays notify-only (`duaer self-update`).

## Acceptance

1. Missing git → install attempt → then `bootstrapGitRepo` succeeds (or clear error)
2. CLI check stamp in `~/.duaer/cli-tools-check.json`; upgrades at most every 10d
3. `/api/agents` includes versions where available (incl. Claude when possible)
4. `npm test` + `npm run test:live` pass
