# Feature Specification: Revise via dialogue + agent --continue

**Feature Branch**: `feat/revise-dialogue`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

After preview, users start「继续改进」and clarify dissatisfaction in the **left
chat** (why / what to change). Only after the revise card is confirmed does the
desk dispatch. Revise launches reuse Cursor Agent / Claude **`--continue`** so
the Terminal session keeps working on the same job.

## In scope

- Enter revise mode from a single button; freeform one-shot dispatch removed
- `/api/chat` mode `revise` with multi-turn understand
- Confirm card becomes revise card; confirm triggers `/api/revise`
- `launchAgent({ continueSession: true })` → `agent --continue` / `claude --continue`
- Docs EN/ZH (no CJK in EN)

## Out of scope

- Injecting keystrokes into an already-open Terminal TTY
- Resuming a specific chatId UI picker

## Acceptance

1. After accept,「继续改进」opens left dialogue; no immediate dispatch
2. Chat asks about reasons / desired change; revise card fills until ready
3. Only「改进方案确认，再派一版」calls revise + Terminal relaunch
4. Revise Terminal command includes `--continue` for Cursor Agent and Claude
5. English docs mention continue-session revise without CJK

## Assumptions

- `--continue` uses the latest session for that worktree/cwd
- If continue fails (no prior session), agent still runs with the new prompt
