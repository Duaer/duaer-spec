# Feature Specification: Harden project-before-chat gate

**Feature Branch**: `fix/project-chat-gate`  
**Brief**: `.duaer/specs/092-project-chat-gate/`  
**Status**: Active

## Goal

Chat must stay locked until a current project is selected/created. Make the
gate impossible to bypass and show the active project (or「未选项目」) in the UI.

## Acceptance

1. Composer starts disabled; Send / Enter / chips call sendChat which refuses without project
2. Header shows current project title or「未选项目」
3. `/api/chat` still returns NEED_PROJECT when config has no activeProjectPath
4. `npm test` + `npm run test:live` pass
