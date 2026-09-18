# Feature Specification: Persist requirements card + job binding

**Feature Branch**: `feat/project-card-persist`  
**Brief**: `.duaer/specs/096-project-card-persist/`  
**Status**: Accepted

## Goal

When a project is selected, the desk restores not only chat messages but also
the **requirements card** (需求) and **task binding** (任务 / jobId + dispatch
UI), so refresh does not lose mid-confirm or in-progress work.

## Why

Chat persistence (095) left the confirm/revise card and job progress empty
after refresh. Users expect the full desk session to come back with the
project.

## Acceptance

1. Editing confirm/revise fields is saved under the project session file
2. After Confirm, refresh restores locked card + jobId and shows dispatch/progress
3. After Dispatch / revise, refresh restores job binding and resumes status poll
4. Switching projects saves the previous desk session and loads the other
5. `npm test` + `npm run test:live` pass
