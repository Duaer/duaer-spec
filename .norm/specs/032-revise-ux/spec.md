# Feature Specification: Revise UX — brief visible, preview, Terminal reuse

**Feature Branch**: `fix/revise-ux`

**Created**: 2026-09-16

**Status**: Active

## Goal

1.「再改一版」must not bury the original requirements; keep original Brief visible
2. After dispatch / revise, user can always open the (updated) product preview
3. Reuse one Terminal window per worktree for follow-up tasks instead of opening many

## In scope

- Show compact「原始需求」when in revise / revise-locked chrome
- Soften revise CTA: show only when delivery accepted; secondary style
- Preview: keep serving last preview during revising (do not drop delivery.preview)
- Terminal task queue under worktree `.duaer/live-terminal/`; enqueue revise into same runner

## Out of scope

- Cross-machine Terminal remoting
- Changing agent CLI flags beyond queue wrapping

## Acceptance

1. Original goal/acceptance remain readable while「再改一版」is available
2. Preview link stays usable after accept and during/after revise when artifact exists
3. Second revise enqueue does not `open` a new Terminal if runner PID is alive
4. E2E catalog updated
