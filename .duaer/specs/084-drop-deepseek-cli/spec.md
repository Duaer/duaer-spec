# Feature Specification: Drop DeepSeek worker CLI + model tutorial

**Feature Branch**: `feat/drop-deepseek-cli`  
**Brief**: `.duaer/specs/084-drop-deepseek-cli/`  
**Status**: Active

## Goal

1. Remove third-party **DeepSeek TUI / `deepseek` CLI** as a live-desk
   digital-employee launcher (not an official DeepSeek product).
2. Keep DeepSeek as the **desk LLM provider** (chat / validate API).
3. Add a short tutorial: how to run Cursor Agent / Claude Code against
   other model backends (DeepSeek official Anthropic endpoint, etc.).

## Out of scope

- Removing DeepSeek from live `config` / setup UI as chat provider
- Auto-rewriting users' `~/.claude/settings.json`

## Acceptance

1. `/api/agents` catalog has only Cursor Agent + Claude Code workers
2. No `deepseekTerminalCommand` / deepseek worker install path
3. Tutorial doc linked from README (EN + zh-CN)
4. `npm test` + `npm run test:live` pass
