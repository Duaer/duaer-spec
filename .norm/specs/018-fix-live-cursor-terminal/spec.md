# Feature Specification: Cursor Agent launches Terminal + CLI

**Feature Branch**: `fix/live-cursor-terminal`

**Created**: 2026-09-16

**Status**: Active

## Goal

Cursor Agent 派工打开 Terminal，在终端里执行 `agent` / `cursor agent` CLI（带启动命令），不再 `cursor -n` 开 IDE，也不后台静默 `-p`。

## Acceptance

1. cursor-agent → launchInTerminal with cursor CLI; mode=terminal
2. Hint/UI 文案反映 Terminal + CLI
3. 不调用 openCursorWorktree for cursor-agent
