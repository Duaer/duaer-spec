# Feature Specification: Streaming chat replies

**Feature Branch**: `feat/live-stream`

**Created**: 2026-09-15

**Status**: Active

## Goal

现场开发对话框支持流式输出：助手回复边生成边显示。

## Acceptance

- `/api/chat` 默认 SSE 流式：先推 reply 文本，结束时推完整确认卡字段
- UI 气泡随 delta 更新；结束后应用卡片与 options
- 自动验收 confirm 仍可非流式
