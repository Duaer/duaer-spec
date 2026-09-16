# Feature Specification: Open named worktree on auto-start

**Feature Branch**: `fix/live-open-worktree`

**Created**: 2026-09-16

**Status**: Active

## Goal

后台自动开工时，同时用 Cursor 打开派工得到的命名 worktree（如 `.worktree/feat-1`），方便查看与操作。

## Acceptance

1. cursor-agent：后台 `-p` 开工 + `cursor <worktreePath>`
2. claude：`--bg` + 尽量打开 Cursor/VS Code 到该 worktree
3. UI 提示已打开 worktree
