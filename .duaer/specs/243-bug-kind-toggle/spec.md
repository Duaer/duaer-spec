# 243 — Visible bug/feature kind toggle on desk

## Goal

Operators can see and tap **修 bug** without relying on empty-chat starter chips.

## Acceptance

1. Middle column shows a kind switch (`需求` / `修 bug`) before the card is locked.
2. Tapping `修 bug` sets `deskKind=bug` and updates defect card chrome.
3. Switch is hidden or disabled after confirm lock.
4. Cache-bust desk assets; L0 + tests; merge develop; handoff 8787.
