# 169 — Modular FDE requirements then late kickoff

## Goal

Live-desk FDE discovers an evolvable module list during messy chat, confirms
requirements per module, and only at final kickoff builds a dependency-aware
task pool assigned to one or many same-CLI digital employees.

## In scope

- Session `modules[]` + `activeModuleId`; chat JSON evolves inventory while
  dialogue jumps modules
- Per-module confirm cards; confirm locks one module; no Brief/dispatch yet
- Architecture after all modules confirmed; kickoff owns Brief + dispatch
- Task pool with `dependsOn`; default 1 worker; optional N parallel same-CLI
- E2E catalog + live tests for persist / confirm gating / pool markers

## Out of scope

- Changing project create fields
- Mixing Cursor Agent + Claude on the same pool
- Full human sprint board / multi-CLI conflict engine

## Acceptance

1. Messy chat can add/switch modules; drafts persist; confirm is per-module
2. Confirm does not write Brief or launch agents; all-confirmed enables architecture
3. Kickoff writes Brief, builds task pool with deps, launches 1..N same-CLI workers
4. Single-module products still work as one module (degenerate case)
5. L0 + unit + `npm run test:live` pass; E2E catalog updated

## Testing

- L0: `node --check` on changed JS
- L1: `npm test` (project-chat + new modules tests)
- L3: `npm run test:live`
