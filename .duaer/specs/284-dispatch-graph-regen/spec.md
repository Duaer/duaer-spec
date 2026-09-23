# Feature Specification: Regenerate dispatch graph each wave

## Goal

Every kickoff wave (first delivery and each **改进**) must build a **new**
派工图. Confirm/lock buttons follow the operator flow: unlock and ask to
regenerate when the wave changes; stay locked only for the current ready graph.

## Findings (current gaps)

1. `showDispatchPanel` reuses an old `taskPool` after architecture confirm and
   does not force a fresh decompose / clear graph URL.
2. `enterReviseMode` (再改一版) does not clear graph ready/URL/pool.
3. `markDispatchGraphStale` leaves `dispatchGraphUrl` pointing at an old file.
4. Button copy does not distinguish first confirm vs regenerate after stale.

## In scope

- Reset + redecompose on architecture confirm and revise entry
- Clear URL on stale/invalidate; sync chips/button
- Button labels: confirm / regenerate / locked
- Docs + tests

## Out of scope

- Changing Archify render pipeline internals

## Acceptance

1. After「再改一版」→ plan → architecture confirm, confirm-workers is unlocked
   and builds a new graph (new URL); old ready state is not reused.
2. Stale / re-decompose / baseline open-change unlocks and prompts regenerate.
3. `node --test` markers and live smoke pass.
