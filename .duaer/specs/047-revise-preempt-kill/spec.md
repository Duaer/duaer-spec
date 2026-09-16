# Feature Specification: Preempt must kill orphan agent/claude

**Feature Branch**: `fix/revise-preempt-kill`

**Created**: 2026-09-16

**Status**: Active

## Goal

When priorAccepted revise preempts a busy Terminal runner, orphan
`agent` / `cursor-agent` / `claude` children for that worktree must die
too — not only the `running.cmd` bash wrapper.

## Symptom

1. `preemptBusyTerminalJob` SIGTERMs the bash holding `running.cmd`
   (`pkill -f runningPath`).
2. The Cursor `agent` child (e.g. pid 82468, PPID 1) survives as an orphan
   and keeps executing the original Brief.
3. FIFO queue stays backed up; revise never becomes the live agent work.

## Problem

Commit `517290f` preempts the bash job wrapper, but does not reliably
find and terminate worktree-scoped agent CLIs. Matching only
`--workspace <path>` via `pkill -f` is insufficient; orphans keep the
queue busy.

## Out of scope

- Changing pre-accept busy-wait policy
- Redesigning the Terminal FIFO runner
- Killing the long-lived `runner.command` process itself

## Acceptance

1. After preempt, processes whose command line contains the worktree path
   **and** (`agent` | `cursor-agent` | `claude`) receive SIGTERM, then
   SIGKILL if still alive after ~300ms.
2. Processes whose command line contains `runner.command` or
   `live-terminal/runner` are **not** killed by the agent sweep.
3. Every signaled PID is logged to the agent-launch log.
4. `running.cmd` is not deleted under a live bash when avoidable; leave
   cleanup to the runner.
5. priorAccepted revise on `032-orders` shows an agent for Revision (not
   the original Brief) and no leftover first-agent orphan.
6. E2E catalog updated (E2E-047 amend or E2E-048).

## Assumptions

- Worktree path is the same `cwd` passed into `launchInTerminal`.
- Prefer `pgrep -lf` / `ps` enumeration over broad `pkill -f <worktree>`.
