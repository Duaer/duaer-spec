# Feature Specification: Spec AI for satisfactory delivery

**Feature Branch**: `feat/satisfactory-delivery`

**Created**: 2026-09-18

**Status**: Accepted

## Goal

Position Duaer as **规范 AI → 满意交付**: acceptance must be objectively
checkable before confirm/revise dispatch, and public docs lead with that
promise—not phase/skill names.

## In scope

- Stricter local + LLM validate gate for confirm and revise cards
- Positioning copy: README EN/ZH, package description, DUADER, live desk tag/hints
- Dispatch/revise agent prompts emphasize meeting Acceptance + openable preview
- Tests + CHANGELOG / E2E note

## Out of scope

- npm release / promote to main (ship when asked)
- Layout redesign
- New columns or cloud hosting

## Acceptance

1. Vague acceptance (e.g.「更好用」/ “looks better”) fails `/api/validate` locally
2. Checkable acceptance (open X / see Y / command passes) can still pass the gate
3. README EN/ZH lead with 规范 → 满意交付 (English: norms → satisfactory delivery)
4. `npm test` passes

## Assumptions

- Worktree: `.worktree/feat-satisfactory-delivery`
- Brief: `.duaer/specs/061-satisfactory-delivery/`
- User confirmed evolution direction; no further intent wait
