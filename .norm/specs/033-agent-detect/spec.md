# Feature Specification: Detect CLI agents under launchd PATH

**Feature Branch**: `fix/agent-detect`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk must detect installed Cursor Agent / Claude Code even when started
via LaunchAgent (minimal PATH).

## Problem

LaunchAgent PATH is `/usr/bin:/bin:/usr/sbin:/sbin`, so `which agent|claude`
fails even though `~/.local/bin` and `/usr/local/bin` have the CLIs.

## Acceptance

1. `ensureCliSearchPath` prepends `~/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin`
2. `whichCmd` falls back to those dirs if `which` misses
3. `/api/agents` reports installed agents when binaries exist there
4. LaunchAgent plist PATH updated (local handoff) after merge
