# Feature Specification: Cursor CLI dispatch support

**Feature Branch**: `feat/live-cursor-cli`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工启动对齐 Cursor 官方 CLI：用 `cursor -n` 打开命名 worktree，用 `agent` / `cursor agent` 非交互开工（`--workspace --trust -p --force`，不用 `-w`），并暴露 CLI 检测信息。

## Acceptance

1. Open: `cursor -n <worktree>`；尽量 `-g` 到 Brief `tasks.md`
2. Run: prefer `agent` else `cursor agent`; args include `--workspace --trust -p --force --sandbox disabled`; never pass `-w`
3. `/api/agents` includes cursor/agent binary paths (+ optional version)
4. UI hint reflects Cursor CLI behavior
