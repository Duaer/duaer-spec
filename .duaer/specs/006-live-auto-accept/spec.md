# Feature Specification: Auto-accept review on confirm

**Feature Branch**: `feat/live-auto-accept`

**Created**: 2026-09-15

**Status**: Active

## Goal

点「需求无误，开始干活」时，先用已配置模型自动验收确认卡；通过才写入 Brief。

## Acceptance

- Confirm 调用自动验收；未通过返回 issues，不写 Brief
- 通过后写入 Brief，并记录验收摘要
- UI 显示「自动验收中…」及失败原因
