# Feature Specification: Live desk → product repo dispatch

**Feature Branch**: `feat/live-dispatch`

**Created**: 2026-09-16

**Status**: Active

## Goal

确认并自动验收通过后，用户选择产品仓库；系统写入 Brief、从 develop/main 建 worktree，并给出数字员工开工说明（尽量打开编辑器）。

## Acceptance

1. Confirm 后出现「派工」：可选最近仓库或粘贴绝对路径
2. Dispatch 在目标仓 `.worktree/feat-<name>/` 建隔离区，Brief 在该 worktree 的 `.duaer/specs/`
3. 返回 agentPrompt；若本机有 `cursor`/`code` 则尝试打开 worktree
4. 可查询 delivery 状态（accepted / pending）
5. 未派工前仍只写 `~/.duaer/live/jobs`
