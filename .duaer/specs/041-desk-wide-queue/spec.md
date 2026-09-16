# Feature Specification: Desk wide layout + FIFO queue auto-run

**Feature Branch**: `fix/desk-wide-queue`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

1. Make the live desk UI use a **wide-screen** layout (less cramped on large
   monitors).
2. Fix Terminal task queue so **pending** work in `pending.cmd` **reliably
   auto-executes** after the current `running.cmd` finishes — FIFO,
   wait-for-finish policy unchanged (never interrupt the in-flight task).

## Problem

1. Live desk chrome is capped at a narrow max-width (~1120px); on wide
   displays the two-column desk wastes horizontal space
2. After Spec 040 (honest busy-queue / wait-for-finish), users still see
   queued Terminal tasks that **do not** start when the current task ends —
   `pending.cmd` sits idle until manual intervention
3. Honest busy/queued UI must remain; this job fixes **execution**, not the
   wait-vs-interrupt policy

## User decision (frozen)

- **Wait** for current Terminal task to finish; **do not** interrupt
- Keep FIFO via `pending.cmd` → promote to `running.cmd` when free
- Wider desk layout; keep existing stage structure (chat left / cards right)

## In scope

- Widen live desk layout (header / desk / notice containers and related
  constraints) so the UI reads as wide-screen on large monitors; preserve
  usable mobile/narrow breakpoint behavior
- Ensure Terminal runner loop (or equivalent enqueue path) **always** picks
  up the next `pending.cmd` after `running.cmd` exits successfully or with
  failure — no stuck queue
- Keep API/UI honesty from 040: `queued` / `busy` / `reused` (or equivalent)
  and zh-CN/en “queued until current finishes” copy when busy
- E2E catalog note **E2E-042** covering wide desk + FIFO auto-run after
  finish

## Out of scope

- Interrupting, preempting, or cancelling in-flight `running.cmd`
- Changing first-dispatch / cold-open Terminal flows except as needed for
  reliable queue drain
- Redesigning revise card chrome, scroll-sync (039), or i18n strings beyond
  queue honesty already shipped
- Remote push / promote to `main`

## Acceptance

1. Live desk layout is visibly wider on a large viewport (primary desk
   containers no longer stuck at the old ~1120px cap, or an agreed wider
   cap); narrow/mobile layout remains usable
2. When a healthy runner finishes `running.cmd` and `pending.cmd` exists,
   the next task **auto-starts** without user re-click or new Terminal
3. Wait-for-finish policy holds: enqueue while busy still writes
   `pending.cmd` and does **not** kill/replace the current task
4. Busy/queued UI stays honest (no false “agent already started” solely from
   reuse); idle reuse unchanged
5. E2E-042 documents wide desk + FIFO auto-run after finish

## Notes

- Queue files live under `<worktree>/.duaer/live-terminal/jobs/*.cmd`
- Runner uses `runner.lock.d` (mkdir) so only one Terminal drains the queue
- After upgrading live, **close any old pre-FIFO Terminal tab** once if it still
  sits idle; the next dispatch/revise opens the new drain loop
- Wait-for-finish policy unchanged (Spec 040)
