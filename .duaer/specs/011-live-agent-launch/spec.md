# Feature Specification: Live desk agent detect + launch

**Feature Branch**: `feat/live-agent-launch`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工后不只给文案：检测本机已安装的数字员工（Cursor Agent、Claude Code，以及仅打开仓库的 Cursor / VS Code），在现场开发页面列出可选，用户选中后启动并带上开工 prompt。

## Out of scope

- 远程/云端 Agent 编排
- 代填各工具的 API Key / 登录
- 默认开启 bypassPermissions / dangerously-skip-permissions（Claude）
- 自动合入 / 自动 stamp delivery（仍由被启动的数字员工完成）

## Acceptance

1. `GET /api/agents` 返回本机检测到的启动器列表（至少探测 `agent`/`cursor agent`、`claude`、`cursor`、`code`）
2. 派工面板展示可用启动器供点选；可「仅派工不启动」
3. 派工时可带 `agentId`；或派工后再 `POST /api/dispatch/launch` 启动
4. Cursor Agent：在 worktree 上以 prompt 启动（非交互 `-p`，记录日志）；Claude Code：`--bg` 后台开工；`cursor`/`code`：打开 worktree
5. UI 文案不再暗示「请手动复制给数字员工」为唯一路径
6. E2E catalog 增加场景；smoke curl 覆盖 detect + launch（launch 可用假/探测级）

## Assumptions

- macOS/Linux PATH 上有 CLI 即视为已安装
- Cursor Agent 启动使用 `--trust`；为无人值守加 `--force`（用户显式点启动）
- 上次选用的 agentId 可记在 live 配置里作默认
