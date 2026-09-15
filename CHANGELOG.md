# Changelog

## Unreleased

### Live base branch bootstrap

- If a git repo has no develop/main/master, auto-create local `develop` from HEAD (or empty commit)

### Live git bootstrap

- Browsing / adding a non-git folder auto-runs `git init -b develop` + initial commit (skips home/root; skips parent-of-many-repos)

## 0.11.0 — 2026-09-16

### Live browse remember

- Fix「浏览…」: persist selection into recent list immediately; normalize paths; accept `master`

### Live repo pick

- Dispatch: system folder picker, scan common dirs, filterable list
- `duaer live repo add [path]` remembers a product repo (default cwd)

### Live dispatch

- After confirm + auto-accept: pick a product repo, create `.worktree/feat-*`, write Brief under that worktree’s `.duaer/specs/`
- Remembers recent repos; polls `delivery.json` status; opens `cursor`/`code` when available

### Live streaming chat

- Dialogue replies stream over SSE (`/api/chat`); text appears token-by-token before the confirm card updates

### Live auto-accept

- Confirm runs model auto-accept of the four-block card; fail returns issues without writing Brief
- Passed reviews are stamped into the job Brief / `job.json`

### Live desk UI

- Restyle 现场开发 to Probe visual language (steel plate, Outfit + Chivo Mono, register/lock accents)

### Live model presets

- Setup UI / CLI presets: **DeepSeek** (`https://api.deepseek.com` + `deepseek-flash`), OpenAI, custom
- `duaer live config --provider deepseek --api-key …`
- DeepSeek chat calls disable thinking mode for reliable JSON replies

## 0.10.0 — 2026-09-15

### 现场开发 Web

- `duaer live` opens a local page in an **isolated** workspace (`~/.duaer/live`)
- Requires model config: `duaer live config --base-url … --api-key … --model …`
- Dialogue uses OpenAI-compatible chat; confirm writes Briefs under `~/.duaer/live/jobs/`
  (does **not** write into the user's product repository)
- Static UI under `web/live-dev/`

### Understand gate

- `duaer-do` requires **Understand** before Work: restate goal / scope /
  acceptance; vague asks wait for human confirm (≤3 blocking questions)
- DUADER / AGENTS / Cursor + Claude always-on rules mention the gate
- `duaer-clarify` remains the deep Spec clarifier; Understand is the front door
- E2E-006 updated

### Verification gate

- `.duaer/memory/testing.md` is an actionable risk-based verification contract
- Agents must run required levels before accept / merge to `develop` (no blanket E2E ban)
- `duaer-do` / `duaer-tasks` / `duaer-converge` / `duaer-implement` default to verification
- Optional `delivery.json.verification` evidence on accept
- ADR-001; E2E-017–020; ops docs and always-on rules updated

## 0.9.0 — 2026-09-15

### More common agent hosts

- GitHub Copilot: `.github/copilot-instructions.md`
- Windsurf + Devin: `.windsurf/rules/`, `.devin/rules/`
- Cline: `.clinerules/`
- Continue: `.continue/rules/`
- Gemini CLI: `GEMINI.md`
- Aider: `.aider.conf.yml` (reads `AGENTS.md`)
- Cursor / Claude Code / Codex unchanged

## 0.8.0 — 2026-09-15

### Codex host

- Mirror `duaer-*` skills to `.agents/skills/` (Codex discovery path)
- `AGENTS.md` always-on section names the Codex / Cursor / Claude skill roots
- Cursor and Claude Code installs unchanged

## 0.7.0 — 2026-09-15

### Claude Code host

- `init` / `update` install **both** Cursor and Claude Code surfaces
- Claude: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/skills/duaer-*` (mirrored)
- Cursor: `.cursor/rules/*.mdc`, `.cursor/skills/duaer-*` (unchanged)

## 0.6.4 — 2026-09-15

### Worktree ≠ Brief folder name

- Clarify two layers: `.worktree/feat-<name>/` (full checkout) vs
  `.duaer/specs/<nnn-slug>/` (Brief)
- Forbid naming the worktree after the Brief slug (avoids
  `.worktree/002-x/.../specs/002-x/` double naming)

## 0.6.3 — 2026-09-15

### Docs: update path in installed 说明

- `DUADER.md` and `docs/agent/branching-and-release.md` document `npx duaer-spec update`
- Add `README.zh-CN.md` (install / update / branches)
- ADOPT clarifies: do not use `init --force` for everyday refresh

## 0.6.2 — 2026-09-15

### Simple update

- `npx duaer-spec update` refreshes an existing install (no `--force` flags to remember)
- Remembers prior init mode from `.duaer/duaer-init.json`
- README / ADOPT: install + update are each one line

## 0.6.1 — 2026-09-15

### Worktree → develop service handoff

- `.duaer/handoff.json` + `duaer handoff [--run]`
- Mandatory restart on develop after worktree remove

## 0.6.0 — 2026-09-15

- Mandatory `main` / `develop` / `feat/*` / `fix/*` + release flows

## 0.5.1 — 2026-09-15

- Mandatory `.worktree/` (gitignored)

## 0.5.0 — 2026-09-15

- Autonomous digital employee

## 0.4.0 — 0.1.0

See git history for earlier notes.
