# Feature Specification: Project name + background

**Feature Branch**: `feat/project-meta`  
**Brief**: `.duaer/specs/091-project-meta/`  
**Status**: Accepted

## Goal

When creating/opening a product project on the FED desk, the human must enter a
**display name** and a short **background** description (not only a folder path).
These persist with the project and show in the project list.

## In scope

- Persist `title` (display name) + `description` on remembered projects (`repos.json`)
- Create form: folder path/name + 项目名称 + 背景描述
- List / active line show title; description as secondary line
- Activate API accepts and saves title/description
- Tests + E2E note + CHANGELOG

## Out of scope

- SQLite; editing history of descriptions; LLM-generated backgrounds

## Acceptance

1. Create/activate requires a non-empty project title
2. Background description is saved and shown on the project row (may be empty only if user left blank — prefer prompting a short line)
3. Folder path still works as before (parent + short name or absolute path)
4. `npm test` + `npm run test:live` pass

## Assumptions

- Require **title**; description optional but UI labels it clearly as「背景描述」
- Worktree: `.worktree/feat-project-meta`
