# Feature Specification: Live agent actually runs

**Feature Branch**: `fix/live-agent-run`

**Created**: 2026-09-16

**Status**: Active

## Goal

选 Cursor Agent / Claude 派工后，真正启动可运行的数字员工会话（终端可见），而不是只打开 Cursor 窗口；默认不要记住「仅打开 IDE」。

## Acceptance

1. cursor-agent：打开 worktree，并在 Terminal（macOS）或等效方式启动 `agent --workspace … --trust --force`（交互，不用 `-p` 静默）
2. claude：在终端启动交互 `claude`（或明确后台时写清日志）；不再让用户误以为「打开 Cursor」就是开工
3. preferredAgentId 只持久化 worker；open-only 不覆盖默认
4. UI 文案区分「开工」与「仅打开」
