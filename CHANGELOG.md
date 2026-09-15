# Changelog

## 0.6.1 — 2026-09-15

### Worktree → develop service handoff

- Mandatory handoff after merge: stop worktree-bound processes, remove
  `.worktree/<id>`, restart from primary checkout on `develop`
- `.duaer/handoff.json` configures restart commands (e.g. `npm run dev`)
- CLI: `duaer handoff` / `duaer handoff --run`
- Docs: update path for existing installs (`init --force` + review diff)

## 0.6.0 — 2026-09-15

### Mandatory branch model + release flows

- Required: `main` / `develop` / `feat/*` / `fix/*`
- [`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)

## 0.5.1 — 2026-09-15

- Mandatory `.worktree/` (gitignored)

## 0.5.0 — 2026-09-15

- Autonomous digital employee (ask, don’t operate phases)

## 0.4.0 — 2026-09-15

- Everyday `/duaer-do` path (later agent-internal)

## 0.3.0 — 2026-09-15

- Job handoff policy

## 0.2.0 — 2026-09-15

- `delivery.json`

## 0.1.1 — 2026-09-15

- Digital-employee positioning

## 0.1.0 — 2026-09-15

- First public release
