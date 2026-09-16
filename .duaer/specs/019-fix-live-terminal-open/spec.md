# Feature Specification: Reliable Terminal open for Cursor Agent

**Feature Branch**: `fix/live-terminal-open`

**Created**: 2026-09-16

**Status**: Active

## Goal

Cursor Agent 派工时真正弹出 Terminal：用 `.command` + `open`（并修正 osascript 引号）。

## Acceptance

1. macOS uses `open *.command` to launch Terminal with Cursor CLI
2. Failed open falls back to correctly quoted osascript; both fail → error with command
3. Launch log records open result
