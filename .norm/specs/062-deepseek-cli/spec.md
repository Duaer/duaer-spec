# Feature Specification: DeepSeek CLI digital employee

**Feature Branch**: `feat/deepseek-cli`

**Created**: 2026-09-18

**Status**: Accepted

## Goal

Live desk can launch **DeepSeek TUI** (`deepseek` / `deepseek-tui`) as a third
CLI digital employee alongside Cursor Agent and Claude Code.

## In scope

- Detect `deepseek` on PATH (incl. npm global / nvm / cargo bins under launchd)
- Dispatch + revise Terminal launch with workspace, YOLO tools, optional `--continue`
- Preempt matching for deepseek processes; install hint `npm install -g deepseek-tui`
- README / i18n / tests

## Out of scope

- Embedding DeepSeek API chat (already used for desk validate) as the worker
- Shipping npm release unless asked

## Acceptance

1. With `deepseek` installed, desk lists **DeepSeek** as available CLI
2. Dispatch/revise enqueue a Terminal command using `deepseek -w <worktree> …`
3. Without `deepseek`, missing list shows install command
4. `npm test` passes

## Assumptions

- Target CLI: DeepSeek-TUI entrypoint `deepseek` (`npm i -g deepseek-tui`)
- Worktree: `.worktree/feat-deepseek-cli`
- Brief: `.duaer/specs/062-deepseek-cli/`
