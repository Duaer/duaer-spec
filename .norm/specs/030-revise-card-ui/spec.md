# Feature Specification: Revise card stays visible after dispatch

**Feature Branch**: `fix/revise-card-ui`

**Created**: 2026-09-16

**Status**: Active

## Goal

After the user confirms a revision and dispatch succeeds, the right-hand card
keeps showing that revision (like the confirm card after first accept). Chat
busy must not look like "续派中".

## Problem

1. UI stuck on「正在对话或续派，请稍候…」/「续派中…」even after dispatch
2. After dispatch, chrome falls back to confirm/specify ("继续收集需求") so the
   confirmed revision is no longer visible as an improve card
3. Users need the right panel to show this round's confirmed improve fields

## In scope

- Separate chat busy vs revise-dispatch busy for button/hint copy
- After successful `/api/revise`: keep right card as locked 改进卡 with the
  confirmed fields; CTA "已续派";「继续改进」starts a new round
- Do not reset to specify confirm-card chrome on revise success
- E2E catalog note

## Out of scope

- Changing Terminal `--continue` launch
- Redesigning dispatch progress polling

## Acceptance

1. During left-chat only: hints say dialogue in progress, not「续派中」
2. During revise POST: show「续派中…」; after success clear it
3. After success, right card remains 改进卡 with locked confirmed values
4.「继续改进（左侧对话）」available for another round; entering clears for new card
