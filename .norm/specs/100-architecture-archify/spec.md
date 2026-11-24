# Feature Specification: Architecture design with Archify render

**Feature Branch**: `feat/architecture-archify`  
**Brief**: `.duaer/specs/100-architecture-archify/`  
**Status**: Accepted

## Goal

After requirements are confirmed and before dispatch, the desk runs an
architecture dialogue. The result is rendered like
[Archify](https://tt-a1i.github.io/archify/) (self-contained interactive HTML),
shown under the planned-hosting area, and injected into the digital-employee
prompt. Every job needs an architecture (including「暂不部署」). When
requirements are revised, architecture must be updated and re-confirmed before
the next dispatch.

## Why

Hosting choice alone is not enough; the employee needs an agreed system map.
Archify-quality rendering matches the visual language users already trust.

## Acceptance

1. After Confirm, chat enters architecture design (all deploy targets)
2. Dialogue produces Archify architecture JSON → rendered HTML preview
3. Confirm architecture locks the diagram under「计划托管平台」
4. Dispatch / revise-dispatch blocked until architecture is confirmed
5. Revise keeps confirmed architecture by default; re-confirm only when a
   new/changed diagram is produced (prior stays above; new below) — see
   `119-arch-revise-keep`
6. Architecture persists with the project desk session
7. Worker prompt includes architecture summary + IR path/HTML note
8. `npm test` + `npm run test:live` pass

## Notes

- Renderer: MIT Archify CLI bootstrapped under `~/.duaer/tools/archify`
- Desk LLM authors JSON IR; server auto-layouts missing `pos`/`size` then
  `archify deliver architecture … --quality standard`
