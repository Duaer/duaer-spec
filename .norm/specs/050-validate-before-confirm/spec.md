# Feature Specification: Validate before confirm / revise dispatch

**Feature Branch**: `feat/validate-before-confirm`

**Created**: 2026-09-16

**Status**: Active

## Goal

Before the human can confirm (confirm card) or enqueue revise (改进卡), the
desk must validate the card. Only after validation passes may the human send
it. What is handed to the digital employee must be executable — the agent must
not re-enter "Confirming intent / pick among options" loops.

## Problem

Confirm and revise can currently be sent without a successful auto-accept
pass on the current card fields. That lets incomplete or ambiguous intent
reach Brief write / revise launch, so the digital employee may stop again to
clarify multi-choice options instead of executing.

## In scope

- Gate **Confirm** until auto-accept validation has passed for the current
  confirm-card fields
- Gate **revise dispatch** the same way for the revise card (auto-accept for
  revise)
- On failure: show issues; keep auto-fix available; block skip-to-Brief /
  skip-to-revise-launch
- Agent launch prompts state the Brief is already accepted — execute; do not
  ask clarifying multi-choice confirmation
- Chat may still clarify before the card is ready; human confirm remains
  gated on validation pass

## Out of scope

- Changing chat clarification UX beyond the confirm/revise send gate
- Redesigning auto-accept model selection or scoring criteria (reuse existing
  auto-accept)
- Remote push / promote to `main`
- Unrelated desk layout / progress column work

## Acceptance

1. Confirm button stays disabled (or blocked) until auto-accept validation
   has passed for the current card fields
2. Revise dispatch button uses the same gate (auto-accept for the revise card)
3. Failures show issues; auto-fix remains available; the human cannot skip
   failed validation to write Brief or launch revise
4. Agent launch prompts state the Brief is already accepted — execute, do not
   ask clarifying multi-choice confirmation
5. Chat may still clarify before ready, but human confirm is gated on
   validation pass

## Assumptions

- Auto-accept already exists for confirm / revise (see related Briefs such as
  `006-live-auto-accept`, `026-auto-fix-accept`); this job moves the gate
  **before** send rather than only as a side effect of the click
- Re-validation is required when card fields change after a prior pass
- Worktree: `.worktree/feat-validate-before-confirm` on
  `feat/validate-before-confirm`
- Brief: `.duaer/specs/050-validate-before-confirm/`
