# Feature Specification: Live delivery preview link

**Feature Branch**: `feat/live-preview-link`

**Created**: 2026-09-16

**Status**: Active

## Goal

delivery accepted 后现场开发展示可点击的成品链接（`delivery.preview` 或 worktree 内常见静态页），用户可直接打开查看。

## Acceptance

1. Agents stamp `preview.url` (http(s) or worktree-relative path) in delivery.json when there is a viewable artifact
2. `/api/status` returns `preview: { url, label, source }`
3. Live serves worktree files at `/api/artifact?jobId=&path=` (path confined to worktree)
4. UI shows 「查看成品」 link/button on accept; bubble mentions the link
5. Dispatch prompt/tasks require preview for UI deliverables
