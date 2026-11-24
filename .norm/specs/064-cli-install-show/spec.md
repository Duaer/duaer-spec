# Feature Specification: Show CLI install commands when missing

**Feature Branch**: `feat/cli-install-show`  
**Brief**: `.duaer/specs/064-cli-install-show/`  
**Status**: Accepted

## Goal

「用哪个 CLI 数字员工启动」must detect install status; if not installed,
show the install command clearly (on the chip + install panel), with redetect.

## Acceptance

1. Missing CLIs render as distinct chips with install command text visible
2. Install panel lists the selected missing CLI’s command + copy button
3. Redetect button refreshes `/api/agents`
4. `npm test` passes
