# 168 — Rename FED → FDE

## Goal

Correct the desk brand acronym to **FDE** (Field Development Environment /
现场开发). Was incorrectly **FED** / Field Engineering Desk.

## In scope

- User-facing copy, SVG brand mark, README, live desk, intro site, agent prompts
- Tests / E2E catalog rows that name the brand

## Out of scope

- Renaming historical Brief folder ids under `.duaer/specs/`
- Rewriting old CHANGELOG entries (add a new Unreleased note instead)

## Acceptance

1. UI / SVG / README show **Duaer-spec FDE**
2. EN mark is Field Development Environment; ZH remains 现场开发
3. Targeted brand tests pass; Pages site asset updated
