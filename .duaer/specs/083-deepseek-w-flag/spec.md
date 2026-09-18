# Feature Specification: DeepSeek launch uses -w

**Feature Branch**: `fix/deepseek-w-flag`  
**Brief**: `.duaer/specs/083-deepseek-w-flag/`  
**Status**: Active

## Goal

Fix live Terminal DeepSeek launch: stop passing Cursor-style `--workspace`
(rejected by `deepseek` CLI); use `-w <worktree>` per E2E-060 / 062.

## Acceptance

1. `deepseekTerminalCommand` emits `-w <path>`, not `--workspace`
2. Display / tests / CHANGELOG / E2E note aligned
3. `npm test` + `npm run test:live` pass

## Symptom

```
error: unexpected argument '--workspace' found
Usage: deepseek [OPTIONS] [PROMPT]
```
