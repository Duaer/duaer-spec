# Feature Specification: Create missing product dirs + projects root

**Feature Branch**: `feat/repo-mkdir`  
**Brief**: `.duaer/specs/085-repo-mkdir/`  
**Status**: Active

## Goal

1. When the product path does not exist (e.g. `/Users/morgan/22222`), create
   the directory (recursive) then continue probe / `git init` / dispatch.
2. Allow a saved **projects root** (parent folder). Relative names / short
   project names resolve under that parent and are created there.

## Out of scope

- Changing browse/native folder picker behavior for existing folders
- Auto-creating under `$HOME` without an explicit projects root when the
  input is a bare relative name

## Acceptance

1. Missing absolute path → mkdir → probe/bootstrap succeeds (not「路径不存在」)
2. Config `projectsRoot` persisted; relative `foo` → `$projectsRoot/foo`
3. Refuse creating at filesystem root or exactly `$HOME`
4. Desk UI: projects-root field + path hint; i18n EN/zh
5. `npm test` + `npm run test:live` pass
