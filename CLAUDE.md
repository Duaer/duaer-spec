# CLAUDE.md — duaer-spec

This repository uses **duaer-spec**: coding agents are digital employees.

**Precedence:** `AGENTS.md` (ops) wins over `DUADER.md` / `.duaer/` (method).

## Always on

- Follow `.claude/rules/` in this project.
- For product work, run the job loop in `.claude/skills/duaer-do/SKILL.md`
  without waiting for slash commands.
- Do not ask the human to operate phases, CLI flags, or skill names.

## Layout

| Host | Always-on | Skills / notes |
|---|---|---|
| Cursor | `.cursor/rules/` | `.cursor/skills/` |
| Claude Code | `CLAUDE.md` + `.claude/rules/` | `.claude/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| Copilot | `.github/copilot-instructions.md` | also reads `AGENTS.md` |
| Windsurf / Devin | `.windsurf/rules/`, `.devin/rules/` | — |
| Cline | `.clinerules/` | — |
| Continue | `.continue/rules/` | — |
| Gemini CLI | `GEMINI.md` | — |
| Aider | `.aider.conf.yml` | reads `AGENTS.md` |

Installed by `npx duaer-spec init --here` / `update`.

## Branches

See `docs/agent/branching-and-release.md` and `AGENTS.md`.
Worktree: `.worktree/feat-<name>/` — not the same name as `.duaer/specs/<nnn-slug>/`.
