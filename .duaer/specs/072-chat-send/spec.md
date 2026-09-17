# Feature Specification: Chat send not silent / stuck

**Feature Branch**: `fix/chat-send`  
**Brief**: `.duaer/specs/072-chat-send/`  
**Status**: Active

## Goal

Live desk chat must always give clear feedback when send is blocked, keep the
Send control in sync with gate state, support Enter-to-send, and remain usable
after Confirm / History restore (conversation without silently mutating a
locked Brief).

## Problem

Composer submit returns early when `locked` / `busy` / not ready with **no**
UI feedback; Send stays enabled while locked, so clicks look broken. Enter in
the textarea only inserts a newline. After Confirm or History restore, chat is
fully blocked even for clarifying dialogue.

## In scope

- `chatAllowed` / block reasons surfaced in chat (not silent)
- `syncComposerEnabled` for Send (+ optional placeholder)
- Enter sends; Shift+Enter newline
- When specify card is locked: still allow chat; skip applying card field
  updates from the model (direct user to Revise for Brief changes)
- Stuck `busy` recovery when user retries after a long wait

## Out of scope

- Changing validate-before-confirm gate
- Revise dispatch / Terminal behavior

## Acceptance

1. Locked specify job: typing + Send (or Enter) posts a user bubble and gets a
   reply (or a clear busy/not-ready message); locked card fields are not
   overwritten by chat `goal`/`acceptance` patches
2. While busy / not ready / revise-dispatching: Send is disabled or a bot bubble
   explains why; no silent no-op
3. Enter sends; Shift+Enter keeps newline
4. `node --check web/live-dev/app.js`; `npm test`; `npm run test:live`

## Assumptions

- Worktree: `.worktree/fix-chat-send` (not named `072-chat-send`)
- Hotfix: clear repro → implement after Brief without blocking confirm wait
