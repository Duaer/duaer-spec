# Feature Specification: Unique dispatch worktree names

**Feature Branch**: `fix/dispatch-unique`  
**Brief**: `.duaer/specs/077-dispatch-unique/`  
**Status**: Active

## Goal

Dispatching a new live job into a product repo must not fail with
`worktree 已存在` when an older job already used `feat/<same-slug>`
(e.g. repeated “html” goals → `feat/html`).

## Acceptance

1. Confirm stores a unique branch hint (`feat/<jobId>`)
2. Dispatch auto-picks a free `feat/…` + `.worktree/…` when the preferred
   name is taken (no hard fail for leftover `feat-html`)
3. Unit coverage for allocator; `npm test` + `npm run test:live` pass
