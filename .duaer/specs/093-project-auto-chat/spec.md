# Feature Specification: Auto-start chat after project select

**Feature Branch**: `feat/project-auto-chat`  
**Brief**: `.duaer/specs/093-project-auto-chat/`  
**Status**: Active

## Goal

After the human selects or creates the current project, the desk immediately
starts the requirements dialogue (LLM chat kickoff) — no extra Send needed.

## Acceptance

1. Successful「选为当前项目」/ list select closes the drawer and calls chat with a kickoff that includes project name + background
2. Composer is unlocked; conversation bubble appears
3. `npm test` + `npm run test:live` pass
