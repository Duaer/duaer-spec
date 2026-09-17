# Feature Specification: Live desk L3 smoke suite

**Feature Branch**: `feat/live-l3-smoke`

**Created**: 2026-09-17

**Status**: Active

## Goal

Add an automated L3 smoke suite for the live desk (confirm validate gate +
desk shell markers) that agents run before accept on live UI changes, and
document it in the manuals / testing contract.

## In scope

- `npm run test:live` — start isolated live + mock LLM; cover validate fail/pass,
  validate/fix path, static desk markers (three columns, structured fields,
  validationAllowsSend)
- Wire into `.duaer/memory/testing.md` as the L3 command for this repo
- Update README EN/ZH + CHANGELOG + E2E catalog
- Optional lightweight CI job on push/PR

## Out of scope

- Full Playwright browser interaction / paid live LLM
- Revise Terminal dispatch end-to-end
- npm version bump / publish (docs only unless user asks)

## Acceptance

1. `npm run test:live` passes without network LLM
2. Covers: empty/short card fail, good card pass via mock, fix endpoint,
   HTML/JS/CSS desk markers for layout + gate
3. README (EN/ZH) and testing.md document the command
4. E2E catalog notes automated subset

## Assumptions

- Worktree: `.worktree/feat-live-l3-smoke`
- Brief: `.duaer/specs/054-live-l3-smoke/`
