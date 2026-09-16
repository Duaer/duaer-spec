# Feature Specification: Unstick dispatch UI

**Feature Branch**: `fix/live-dispatch-hang`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工不再因同步打开 Terminal / osascript 卡住；接口快速返回，UI 有超时。

## Acceptance

1. launchInTerminal non-blocking
2. fetch abort 60s; finally clears 派工中
