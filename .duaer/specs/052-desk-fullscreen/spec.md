# Feature Specification: Full-screen desk, chat +50px

**Feature Branch**: `feat/desk-fullscreen`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk uses the full viewport (edge-to-edge). Chat column is 50px wider
than the previous confirm-wide ratio (treat “在宽50px” as 再宽 50px).

## In scope

- Remove shell max-width / side gutters so desk is full-screen width
- Fill viewport height for desk columns where practical
- Widen chat column by ~50px (min track +50px; keep confirm still wider)

## Out of scope

- Changing confirm structured display / validate gates
- Progress column content redesign
- Remote push / promote to main

## Acceptance

1. Desk content spans the full browser width (no 1440px shell cap)
2. Chat column is ~50px wider than before this change
3. Confirm column remains wider than chat
4. Live serves updated CSS after handoff

## Assumptions

- “对话框在宽50px” means widen chat by 50px (not set width to 50px)
- Worktree: `.worktree/feat-desk-fullscreen`
- Brief: `.duaer/specs/052-desk-fullscreen/`
