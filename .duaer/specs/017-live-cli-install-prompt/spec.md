# Feature Specification: CLI install hints + Agent start command box

**Feature Branch**: `feat/live-cli-install-prompt`

**Created**: 2026-09-16

**Status**: Active

## Goal

未安装 Cursor CLI 时提示安装命令；派工区提供「启动命令」输入框，默认以 `Agent` 开头，派工时把该内容交给 Cursor Agent。

## Acceptance

1. missing Cursor / Cursor Agent 带 `installCommand: curl https://cursor.com/install -fsS | bash`，UI 展示可复制
2. 派工面板有启动命令输入框；选 Cursor Agent 时默认以 `Agent` 开头
3. `POST /api/dispatch` 接受 `startCommand`，用作 agent prompt（并补全 worktree/Brief 路径）
4. 未安装却选 Cursor Agent 时阻止启动并提示安装
