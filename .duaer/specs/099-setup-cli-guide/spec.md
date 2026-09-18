# Feature Specification: Setup guide for CLI install + other models

**Feature Branch**: `feat/setup-cli-guide`  
**Brief**: `.duaer/specs/099-setup-cli-guide/`  
**Status**: In progress

## Goal

The FED model setup **说明** explains how to install Cursor Agent / Claude Code
and how to wire other desk / coding models.

## Acceptance

1. Setup page has a 说明/Guide block with Cursor + Claude install commands
2. Guide covers Custom desk models and Claude→DeepSeek (etc.) for coding
3. Header **模型** reopens setup (with 返回台面 when already ready)
4. `worker-models(.zh-CN).md` and README match the install commands
5. Missing Claude installCommand is the concrete npm install line
6. `npm test` + `npm run test:live` pass
