# Feature Specification: CLI-only digital employees

**Feature Branch**: `fix/live-cli-only`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工「用哪个数字员工」只保留 CLI：Cursor Agent、Claude Code；二者均在 Terminal 执行。

## Acceptance

1. `/api/agents` only lists cursor-agent / claude (plus missing install hints)
2. No Cursor-open-only / VS Code / 仅派工 options
3. Claude launches via Terminal like Cursor Agent
