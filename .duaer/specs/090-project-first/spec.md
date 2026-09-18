# Feature Specification: Project-first desk (no SQLite)

**Feature Branch**: `feat/project-first`  
**Brief**: `.duaer/specs/090-project-first/`  
**Status**: Accepted

## Goal

Duaer-spec FED is **project-first**: the human must select or create a product
project before chatting. Conversations (former flat「历史」) hang under that
project. Top bar label is「项目」. Storage stays file-based (`~/.duaer/live/`);
no SQLite in this job.

## In scope

- Persist `activeProjectPath` (+ keep `projectsRoot`) in live config
- Top bar「历史」→「项目」; drawer: create/select project, then conversations
- Gate chat / composer until a project is active
- Stamp project path on confirm; dispatch defaults to active project
- Move「产品父目录」into the project create block (out of mid-dispatch clutter)
- Group jobs by `repoPath` under each project
- Tests, E2E catalog, CHANGELOG

## Out of scope

- SQLite / `desk.db`
- Cloud sync; multi-user
- Renaming CSS class names wholesale (`history-*` may remain as hooks)

## Acceptance

1. Without active project: Send disabled; bot/empty state tells user to open「项目」
2. Create project (parent + name) or browse/select sets active project and unlocks chat
3. Drawer lists projects; under active/selected project, jobs for that path; restore works
4. Confirm/dispatch uses active project path (no need to re-pick unless changed)
5. `npm test` + `npm run test:live` pass

## Assumptions

- Worktree: `.worktree/feat-project-first`
- User confirmed: must select/create first; top bar「项目」; SQLite deferred
