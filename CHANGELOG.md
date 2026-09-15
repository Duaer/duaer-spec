# Changelog

## 0.1.1 — 2026-09-15

### Docs / product identity

- Position Duaer as a **delivery OS for AI digital employees**: hire → assign
  (Spec) → work → accept (converge)
- README, ADOPT, DUADER, AGENTS intro, and CLI `init` / `check` / help copy
  use that language
- E2E catalog: E2E-001 (init next steps), E2E-002 (README positioning)

## 0.1.0 — 2026-09-15

First public methodology release.

### Method

- Own **Duaer** Spec-Driven loop: specify → plan → tasks → implement → converge
- Home directory: `.duaer/` (not an embedded third-party kit)
- Cursor skills: `/duaer-specify`, `/duaer-plan`, `/duaer-tasks`, `/duaer-implement`, `/duaer-converge`, …
- Agent ops (`AGENTS.md`) remain authoritative over the method when they conflict

### CLI

- `duaer init [dir] --all|--method|--ops [--force] [--branch <name>]`
- `duaer check [dir]`
- `duaer version`

### Install

```bash
# From GitHub (works now)
npx github:fujiezee/duaer-spec@v0.1.0 duaer init --here

# From npm (after publish)
npx duaer-spec init --here
```
