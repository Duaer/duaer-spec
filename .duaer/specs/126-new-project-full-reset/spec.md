# Feature Specification: New project resets full desk

## Intent

Creating or switching to a project with an empty desk session must reset
chat, requirements, and run/progress — not only the dialogue column.

## Why

Users expect a new project to look new everywhere. Leftover 需求 / 运行 /
结果 from the previous project is confusing.

## In scope

- Before loading a project session, clear desk surfaces (cards, progress,
  preview, revise, architecture, dispatch, status poll)
- Empty session stays empty; saved session restores on top of the clear
- Smoke / project-chat markers + E2E

## Out of scope

- Changing how sessions are stored on disk
- Deleting old project chat files

## Acceptance

1. After create/switch to empty project: 需求 fields empty, Progress empty,
   no leftover 结果/派工/架构 from the previous project
2. Switching back to a project with a saved session still restores chat + card + job
3. `npm run test:live` (+ project-chat unit) passes
