# 226 — Status poll must not paint another project's progress

## Goal

Switching or creating a project must not keep showing the previous project's 派工进度.

## Why

`clearDeskWorkspace` clears the timeline, but an in-flight `/api/status` from the old `jobId` can finish afterward and call `renderProgress`, so the new desk looks polluted until refresh.

## Acceptance

1. After a status poll returns, if `state.jobId` is no longer the job that was requested, do not apply progress, preview, or accepted chat bubbles.
2. Creating or switching to an empty project still clears the progress column; a stale poll cannot refill it.
3. Covered by a source marker test; E2E catalog updated.
