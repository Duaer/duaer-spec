# E2E test plan (template)

Each adopting project should maintain its own E2E scenario catalog. This file is
a **template** for that catalog — not a product suite.

When a change is user-visible or protocol-visible, add or update a scenario
before or alongside the change (see [R3](workflow.md#r3--e2e-coverage-doc)).

## Scenario template

```text
ID:          E2E-NNN
Title:       Short name
Preconditions:
Steps:
Expected:
Specs:       Links to specs / Duaer feature dirs
Status:      planned | automated | manual
```

## Catalog

This repository’s own product surface (CLI + docs). Adopters replace or extend
the table for their app.

| ID | Title | Status |
|---|---|---|
| E2E-001 | After `duaer init`, banner says talk to agent — no slash ops | manual |
| E2E-002 | README: install once, then plain-language asks | manual |
| E2E-003 | Always-on rule requires autonomous job loop without user slash | manual |
| E2E-004 | Default `coach`: unfinished job — agent must not claim done | manual |
| E2E-005 | Converge stamps `accepted`; agent reports ready for review | manual |
| E2E-006 | `duaer-do` skill describes agent-triggered loop | manual |
| E2E-007 | Request worktrees use `.worktree/<id>`; `.worktree/` gitignored | manual |
| E2E-008 | Docs require main+develop+feat+fix and typed go-live flows | manual |
| E2E-009 | After merge, handoff restarts services on develop (`duaer handoff`) | manual |
| E2E-010 | `npx duaer-spec update` refreshes an existing install | manual |
| E2E-011 | Installed docs (`DUADER.md`, `docs/agent/`) document `update` | manual |
| E2E-012 | `README.zh-CN.md` covers install, update, branch model | manual |
| E2E-013 | Worktree id ≠ Brief `<nnn-slug>`; path is `.worktree/feat-…/.duaer/specs/…` | manual |
| E2E-014 | Init installs Cursor + Claude hosts (`CLAUDE.md`, `.claude/skills`) | manual |
| E2E-015 | Init installs Codex skills under `.agents/skills/` | manual |

## Traceability

| Scenario | Spec / feature | Notes |
|---|---|---|
| E2E-001 | init banner | No human phase ops |
| E2E-002 | README | Ask, don’t operate |
| E2E-003 | `duaer-spec.mdc` | Autonomous |
| E2E-004 | policy coach | Handoff etiquette |
| E2E-005 | `delivery.json` | Accept stamp |
| E2E-006 | `duaer-do` | Internal playbook |
| E2E-007 | `.worktree/` + `.gitignore` | Mandatory isolation |
| E2E-008 | `branching-and-release.md` | Branch + release matrix |
| E2E-009 | `.duaer/handoff.json` / `duaer handoff` | Service handoff |
| E2E-010 | `duaer update` | One-line refresh |
| E2E-011 | DUADER + agent docs | Update path in installed 说明 |
| E2E-012 | `README.zh-CN.md` | Chinese 说明文档 |
| E2E-013 | AGENTS / branching naming | Avoid double `<nnn-slug>` |
| E2E-014 | Claude + Cursor install | Dual host |
| E2E-015 | Codex `.agents/skills` | Triple host |
