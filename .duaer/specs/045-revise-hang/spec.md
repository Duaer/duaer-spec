# Revise dispatch must always answer

**Status**: Accepted

## Goal

`POST /api/revise` on the Live desk must always settle — with a result or a
clear error — so the「改进方案确认，再派一版」button never stays on「续派中…」
forever.

## Problem

`reviseDispatchedJob()` runs several `spawnSync` child processes directly on
the HTTP thread with no `timeout` option, and `callChatModel()` uses a bare
`fetch()` with no abort signal. Node's HTTP server is single-threaded, so one
slow child process freezes every endpoint, not just `/api/revise`.

Reproduced on 2026-09-16 by making `git worktree add` block (a `post-checkout`
hook that sleeps). While the child was blocked:

- `POST /api/revise` returned nothing for as long as the child lived
- `GET /api/health` timed out with **0 bytes** three times in a row
- `ps` showed `git worktree add` as a direct child of the live server pid

The request only completed (400, 32.7s) after the blocked child was killed from
outside. Without that intervention it would have hung for the hook's full sleep.

## Out of scope

- Moving the revise pipeline off the HTTP thread entirely (worker/queue refactor)
- The Terminal FIFO queue policy: revise still waits for the running task to
  finish and still reports `queued` / `busy` honestly
- `pickFolderNative()`, which is a deliberate user-facing modal

## Acceptance

- Every `spawnSync` reachable from `/api/revise` carries a bounded `timeout`
- A timed-out child raises an actionable error naming the command and budget
- `callChatModel()` / `streamChatModel()` abort on a bounded timeout
- `/api/revise` answers with HTTP 200 or 4xx/5xx within its budget — never hangs
- The server-wide freeze becomes bounded by that budget instead of unbounded
  (`spawnSync` still blocks the thread while it runs; only the ceiling changes)
- Enqueued work still lands in `<worktreePath>/.duaer/live-terminal/jobs/`

## Assumptions

- Bounded-timeout guards are the smallest coherent fix; the endpoint answering
  loudly is more valuable than shaving the remaining blocking window
- `git worktree add` performs a full checkout, so it gets a larger budget (60s)
  than ordinary plumbing git calls (20s)
