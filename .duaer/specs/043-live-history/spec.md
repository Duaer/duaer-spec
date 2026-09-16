# Feature Specification: Live history (past jobs)

**Feature Branch**: `feat/live-history`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk shows a **history of past jobs** from `~/.duaer/live/jobs/`: list +
open details, and restore a prior job into the current desk session.

## Confirmed UI

- Header top row: **Live desk** + flow tagline
  (`Clarify → confirm → dispatch → preview → revise` / zh equivalent) on the
  **same row**; history control and language switch on that row too
- Brand title stays below

## In scope

- `GET /api/jobs` list (goal from spec.md, status, timestamps)
- History panel: list rows; click → details + **Restore** into session
- zh-CN / en i18n
- E2E-044

## Out of scope

- Delete/archive jobs
- Persist full chat transcripts
- Cloud sync
- Push / `main`

## Acceptance

1. Flow tagline sits on the same row as “Live desk”
2. History entry on that header row opens a list of past jobs
3. Each row shows goal, status, time
4. Restore loads that jobId into desk (dispatch / progress / preview / revise when available)
5. zh-CN / en strings; E2E-044
