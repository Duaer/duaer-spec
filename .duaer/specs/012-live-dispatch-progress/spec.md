# Feature Specification: Live dispatch progress

**Feature Branch**: `feat/live-dispatch-progress`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工后现场开发能看到数字员工做到哪一步：轮询产品仓 Brief 的 `tasks.md` 勾选状态，并展示当前步骤；可选附带启动日志尾部。

## Out of scope

- 实时流式推送 Agent token
- 解析 IDE 内部会话状态
- 强制远程 Agent 上报自定义协议（依赖 tasks.md 勾选约定）

## Acceptance

1. `GET /api/status` 返回 `progress`：tasks 列表（done/pending）、done/total、current 文案
2. 派工面板展示进度清单，随轮询更新
3. delivery accepted 时进度显示完成并停止轮询
4. 派工写入的 tasks / agentPrompt 明确要求边做边勾选
5. Smoke curl + E2E catalog

## Assumptions

- 数字员工按 Duaer 流程会更新 `tasks.md` 的 `- [x]`
