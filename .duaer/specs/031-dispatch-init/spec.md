# Feature Specification: Init Duaer in the chosen product directory

**Feature Branch**: `fix/dispatch-init`

**Created**: 2026-09-16

**Status**: Active

## Goal

When the user picks a product directory for live dispatch, install/init Duaer
**in that directory** (and the created worktree). Do not redirect to another
repo or leave the agent to hunt for Duaer elsewhere.

## Problem

User selected a folder; it had no Duaer install; the flow “went looking”
elsewhere (child git repo or agent search) instead of initializing in place.

## In scope

- Dispatch uses the chosen path (no silent single-child repo redirect)
- Auto `git init` + `duaer init --here` in the chosen dir when needed
- After worktree create: ensure Duaer is installed inside the worktree too
- Agent prompt: work only here; Duaer already installed; do not search other trees
- Browse/remember path: same ensure when registering a repo

## Out of scope

- Changing npm global self-update
- Forcing commit of init files onto develop

## Acceptance

1. Dispatch to empty/non-duaer folder installs Duaer under that path
2. Worktree contains AGENTS.md / `.duaer/` before agent launch
3. Choosing a parent with one child git repo no longer silently switches; init stays on chosen path (or clear error)
4. Docs/E2E note
