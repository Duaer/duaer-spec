# Feature Specification: Live model presets (DeepSeek)

**Feature Branch**: `feat/live-deepseek`

**Created**: 2026-09-15

**Status**: Active

## Goal

现场开发模型配置要能一键/明确选用 DeepSeek（OpenAI 兼容），不必用户自己猜 Base URL 和模型名。

## In scope

- UI: DeepSeek preset（填入官方兼容 Base URL + 默认模型）
- CLI help / docs 示例含 DeepSeek
- 仍走现有 OpenAI-compatible `/chat/completions`

## Out of scope

- DeepSeek 专有 SDK
- 自动拉取 API Key
- 其它厂商完整目录（可保留「自定义」）

## Acceptance

- 配置页可选 DeepSeek，一键填好 `https://api.deepseek.com/v1` 与默认模型（如 `deepseek-chat`）
- 用户仍只需填 API Key（或覆盖模型名）
- `duaer live config` 帮助/文档示例含 DeepSeek
- 不写入业务仓库；配置仍在 `~/.duaer/live/config.json`
