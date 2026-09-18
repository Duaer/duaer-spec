# Feature Specification: Persist project chat across refresh

**Feature Branch**: `feat/project-chat-persist`  
**Brief**: `.duaer/specs/095-project-chat-persist/`  
**Status**: Accepted

## Goal

Each project's desk conversation is saved under `~/.duaer/live/project-chats/`
and restored when that project is active (including after page refresh).

## Acceptance

1. After chatting on a project, refresh restores the same messages
2. Switching projects saves the previous chat and loads the other
3. Empty project still auto-kickoffs; project with history restores (no re-kickoff)
4. `npm test` + `npm run test:live` pass
