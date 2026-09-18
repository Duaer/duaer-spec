# Feature Specification: Claude auto-execute on dispatch

**Feature Branch**: `fix/claude-auto-perms`  
**Brief**: `.duaer/specs/086-claude-auto-perms/`  
**Status**: Active

## Goal

FED Terminal launches of Claude Code must not stop for tool/permission
prompts on every edit. Use Claude’s bypass permission mode (same intent as
Cursor `--force --trust`).

## Acceptance

1. Launch line includes `--permission-mode bypassPermissions`
2. Display / tests / CHANGELOG updated
3. `npm test` + `npm run test:live` pass
