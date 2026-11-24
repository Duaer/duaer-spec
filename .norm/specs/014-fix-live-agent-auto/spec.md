# Feature Specification: Live agent auto-run (no wait for input)

**Feature Branch**: `fix/live-agent-auto`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工选 Cursor Agent / Claude 后立刻非交互开工，不落在终端/IDE 里等用户再输入。

## Acceptance

1. cursor-agent：`agent -p --force --trust --workspace` 后台 spawn，prompt 作 argv；日志写入 agent-launch.log
2. claude：`claude --bg` 后台开工（非交互）
3. 不再为 worker 打开交互 Terminal；不默认只打开 Cursor 空窗导致误以为要手输
4. UI 说明「已后台自动开工」
