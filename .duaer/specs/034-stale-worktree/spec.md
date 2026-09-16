# Feature Specification: Survive worktree handoff cleanup

**Feature Branch**: `fix/stale-worktree`

**Created**: 2026-09-16

**Status**: Active

## Goal

After the digital employee merges and removes the request worktree, the live
desk must still show accepted status / preview from the product repo, and
revise must recreate a worktree instead of erroring「worktree 已不存在」.

## Acceptance

1. Status resolves Brief/delivery from `repoPath` + `specDir` when worktree gone
2. Preview/artifacts serve from primary checkout when needed
3. Revise recreates `.worktree/feat-*-rN` from develop and copies Brief
4. canRevise true when primary Brief exists
