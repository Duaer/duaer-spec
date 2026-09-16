# Feature Specification: Wider confirm card, structured expand

**Feature Branch**: `feat/confirm-wide`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk: chat column narrower; requirements / confirm column wider.
Requirements text shows fully expanded (no inner scroll) and is rendered as
structured sections (paragraphs / lists), not a cramped scrolling form.

## Problem

Chat is the widest column while the confirm card is squeezed. Card fields
scroll inside a fixed-height panel, so long goal / acceptance text is hard to
read as a structured Brief.

## In scope

- Rebalance three-column grid: chat narrower, middle confirm/requirements wider
- Requirements (and revise card) fields: full expand, no panel/field scroll for
  that content
- Structured display of goal / out / acceptance / assumptions (paragraphs and
  bullet / numbered lists); still editable before confirm
- Progress column may keep its own scroll

## Out of scope

- Changing validate / confirm / dispatch / revise behavior
- Redesigning progress column contents
- Remote push / promote to main

## Acceptance

1. Chat is narrower than the middle requirements/confirm column on desktop
2. Middle column shows requirement text fully expanded without an inner scroll
3. Requirement fields render as structured sections (lists/paragraphs), not
   only raw scrolling textareas
4. Fields remain editable until locked; revise card follows the same display
   rules
5. Progress column still works; no change to send/validate gates

## Assumptions

- Worktree: `.worktree/feat-confirm-wide` on `feat/confirm-wide`
- Brief: `.duaer/specs/051-confirm-wide-structured/`
