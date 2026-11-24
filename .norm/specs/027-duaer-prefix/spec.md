# Feature Specification: Start command prefix Duaer

**Feature Branch**: `feat/duaer-prefix`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk start-command / agent-prompt prefix is **`Duaer`**, not `Agent`.

## Acceptance

1. UI label/placeholder and default start command use `Duaer`
2. Server dispatch/revise enforce `/^Duaer\b/`; legacy `Agent` prefix is rewritten to `Duaer`
3. README EN/ZH and CHANGELOG mention `Duaer` prefix (EN docs no CJK)

## Out of scope

- Renaming Cursor Agent product labels
