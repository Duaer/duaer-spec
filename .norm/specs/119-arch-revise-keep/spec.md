# Brief: Keep prior architecture on revise

## Goal

When revising a delivered job, keep the previously confirmed architecture
visible. Re-confirm only if the revision changes the architecture. Show the
old diagram above; place any new diagram below it.

## In scope

- Do not wipe confirmed architecture on「再改一版」
- Snapshot prior diagram when a new architecture is designed/rendered
- Dual panel: 原架构 (top) + 新架构 (below) when they differ
- Same IR fingerprint as prior → stay confirmed (no re-confirm)
- Optional「架构有变，重新设计」to start a new diagram deliberately
- Persist `architecturePrevious` in project chat

## Out of scope

- Changing Archify renderer
- Auto-detecting architecture change from revise card text alone

## Acceptance

1. Enter revise: prior confirmed architecture remains confirmed and visible
2. Revise-dispatch works without re-confirm when architecture unchanged
3. Redesign / new IR: old stays on top; new preview below needs confirm
4. Identical new IR to prior auto-stays confirmed
5. L0 + L3 + E2E catalog

## Amends

Supersedes `.duaer/specs/100-architecture-archify` acceptance item 5
(revise always clears confirmation).
