# 220 — Project activate click shows feedback

## Goal

Clicking「选为当前项目」always shows a result in the open project drawer.

## Why

Validation only posted a chat bubble behind the drawer, so a missing name or description looked like a dead click. The drawer also clips overflow, so the button can sit below the fold.

## Acceptance

1. Missing path, name, or description shows the message in the drawer (`#historyErr`), not only in chat.
2. While activate is in flight, the button is disabled.
3. The project drawer scrolls so the button stays reachable.
