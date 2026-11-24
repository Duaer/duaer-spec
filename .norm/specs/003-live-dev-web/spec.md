# Feature Specification: 现场开发 Web（对话确认台）

**Feature Branch**: `feat/live-dev`

**Created**: 2026-09-15

**Status**: Active

**Input**: Confirmed — web UI on duaer-spec: multi-round dialogue → four-block confirm → digital employee Brief.

## Goal

Ship a **网页端「现场开发」** so a human can clarify requirements in chat, confirm a fixed four-block card, then hand off a Duaer Brief for the digital employee to work.

## In scope (v1)

- Local web page: dialogue + four blocks (要做什么 / 不做什么 / 验收标准 / 假设)
- Multi-round questions (priority order, one at a time, max 5)
- Confirm button locks intent and writes `.duaer/specs/<nnn-slug>/` Brief + light tasks + `active-job.json`
- CLI: `duaer live` (or `npm run live`) serves UI + write API against the **current project**
- Copyable handoff prompt for the coding agent

## Out of scope (v1)

- Cloud multi-tenant hosting, billing
- Full IDE / auto-merge to main
- Mandatory paid LLM (v1 uses structured questioning; optional later)

## Acceptance

1. User can open the page, answer rounds, edit the four blocks, and confirm.
2. Confirm creates Brief files under `.duaer/specs/` without prior implement.
3. Docs explain how to run `duaer live` from an adopting repo.
