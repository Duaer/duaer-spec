# Changelog

## 0.6.0 — 2026-09-15

### Mandatory branch model + release flows

- Required branches: **`main`** (production), **`develop`** (integration),
  **`feat/*`**, **`fix/*`**
- New doc: [`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)
  — day-to-day, go-live, feature / bug / hotfix / issue / PR flows
- Agent ops merge target is **`develop`**; promote to **`main`** only when
  shipping; hotfixes from `main` then back-merge `develop`
- Worktree cleanup includes stopping services and restarting on `develop` if needed
- `duaer init` default `--branch` is `develop`

## 0.5.1 — 2026-09-15

### Mandatory in-repo worktrees

- Request worktrees **must** live under **`.worktree/<request-id>`**
- `.worktree/` is gitignored; `duaer init` ensures the ignore rule

## 0.5.0 — 2026-09-15

### Autonomous digital employee

- Humans ask; agents run Brief → work → accept without slash-command ops

## 0.4.0 — 2026-09-15

- `/duaer-do` + `duaer status` everyday path (later reframed as agent-internal)

## 0.3.0 — 2026-09-15

- Job handoff policy (`coach` / `strict` / `off`)

## 0.2.0 — 2026-09-15

- `delivery.json` handoff stamp

## 0.1.1 — 2026-09-15

- Digital-employee positioning

## 0.1.0 — 2026-09-15

- First public methodology release
