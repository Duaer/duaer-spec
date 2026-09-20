# 239 — Bug dispatch path on Duaer desk

## Goal

When the operator chooses **fix a bug**, the Duaer desk follows a short defect
path: one defect card, default skip of system architecture, a short
reproduce → fix → regress task pool, and a `fix/<name>` worktree from
`develop` (or `main` for production hotfix). The feature path stays unchanged.

## Why

Chat already offers「我要修一个 bug」, but kickoff always wrote `feat/` Briefs
and required the full modular + architecture gate. Bug work needs a different
branch prefix and a lighter gate.

## In scope

- Desk kind `feature` | `bug` (persisted per project session)
- Bug chat prompt + single-module defect card labels
- Optional architecture (default skip; operator may redesign)
- Short bug task pool (server + preview)
- `fix/` branch allocation; base `develop` or `main` when hotfix
- Spec / ADR / E2E / CHANGELOG / live-desk docs

## Out of scope

- Changing revise / multi-module feature flow
- Automatic production detection beyond an explicit hotfix toggle
- New employee roles

## Acceptance

1. Choosing「我要修一个 bug」(or equivalent locale) sets desk kind to `bug`;
   feature options leave kind `feature`.
2. Bug confirm uses one module (no multi-module tabs growth from chat).
3. After bug confirm, dispatch unlocks without architecture by default;
   architecture panel offers optional redesign.
4. Bug kickoff creates `fix/…` branch (not `feat/`); hotfix toggle uses `main`
   as worktree base when that branch exists.
5. Bug task pool is reproduce → fix → acceptance atoms → regress → README →
   stamp (no full modular implement chain).
6. L0 + unit tests + `npm run test:live` pass; E2E catalog row added.
