# Feature Specification: Guide filling FDE-01 baseline fields

## Goal

Chat and confirm UX must guide (and preferably fill) device matrix, critical
paths, and exception cases — not leave them as empty「待确认」forever.

## In scope

- Feature SYSTEM / ACCEPT / FIX / REVISE prompts include the three fields
- Field-specific placeholders (examples) in UI + i18n
- Smoke assert prompts mention the fields

## Out of scope

- Bug desk (still skips the three fields)
- Changing validate rules

## Acceptance

1. `SYSTEM_PROMPT` / accept / fix prompts list `deviceMatrix` / `criticalPaths` / `exceptionCases`
2. Feature confirm textareas use example placeholders (not bare「待确认」)
3. `npm test` + `npm run test:live` pass
