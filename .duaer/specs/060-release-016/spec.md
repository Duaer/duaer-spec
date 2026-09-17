# Feature Specification: Release 0.16.0

**Feature Branch**: `feat/release-016`

**Created**: 2026-09-18

**Status**: Accepted

## Goal

Ship **0.16.0** to `main` + npm: revise reliability (honest preempt order),
revise-round progress tracking, and accept progress sync.

## Acceptance

1. `package.json` version `0.16.0`; CHANGELOG dated section; Unreleased cleared
2. `main` tagged `v0.16.0`; GitHub Release; npm `latest` is `0.16.0`
3. `npm test` passes before promote

## Assumptions

- Worktree: `.worktree/feat-release-016`
- Brief: `.duaer/specs/060-release-016/`
- User ask「发版」authorizes push + promote `develop` → `main`
