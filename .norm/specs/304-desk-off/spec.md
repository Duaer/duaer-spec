# Feature Specification: Stop restarting the FDE desk on handoff

## Goal

The desk at http://127.0.0.1:8787 kept reloading because every job handoff ran
`launchctl kickstart -k …live8787`. The user no longer wants the desk managed.
Handoff must not start or restart it.

## In scope

1. `.duaer/handoff.json`: no desk restart command or note.
2. `AGENTS.md`, `.claude/rules/agents-workflow.md`, `.cursor/rules/agents-workflow.mdc`, `.cursor/rules/fde-8787-only.mdc`, `docs/agent/live-desk.md`: never start or restart the desk on handoff; start only when the user asks.

Outside this repo (done on the machine, not in git here): LaunchAgent `com.duaer.live8787` stopped and disabled (plist kept); the desk restart removed from `handoff.json` in motioneed, digital-employees, searxng, DuaerMain, archify.

## Acceptance

1. No `kickstart` / `live8787` restart in handoff.json, AGENTS.md or the workflow rules.
2. `npm test` passes.
