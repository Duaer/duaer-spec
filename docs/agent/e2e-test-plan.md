# E2E test plan (template)

Each adopting project should maintain its own E2E scenario catalog. This file is
a **template** for that catalog — not a product suite.

When a change is user-visible or protocol-visible, add or update a scenario
before or alongside the change, **and** run the risk-required verification from
[`.duaer/memory/testing.md`](../../.duaer/memory/testing.md) (see
[R3](workflow.md#r3--verification--e2e-coverage)).
The catalog is not a substitute for executing checks.

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
| E2E-006 | `duaer-do` skill: Brief → Understand → work → accept; vague asks wait for confirm | manual |
| E2E-007 | Request worktrees use `.worktree/<id>`; `.worktree/` gitignored | manual |
| E2E-008 | Docs require main+develop+feat+fix and typed go-live flows | manual |
| E2E-009 | After merge, handoff restarts services on develop (`duaer handoff`) | manual |
| E2E-010 | `npx duaer-spec update` refreshes an existing install | manual |
| E2E-011 | Installed docs (`DUADER.md`, `docs/agent/`) document `update` | manual |
| E2E-012 | `README.zh-CN.md` covers install, update, branch model | manual |
| E2E-013 | Worktree id ≠ Brief `<nnn-slug>`; path is `.worktree/feat-…/.duaer/specs/…` | manual |
| E2E-014 | Init installs Cursor + Claude hosts (`CLAUDE.md`, `.claude/skills`) | manual |
| E2E-015 | Init installs Codex skills under `.agents/skills/` | manual |
| E2E-016 | Init installs Copilot/Windsurf/Cline/Continue/Gemini/Aider adapters | manual |
| E2E-017 | `.duaer/memory/testing.md` defines levels + risk table + DoD | manual |
| E2E-018 | AGENTS requires risk-based verification (no blanket E2E ban) | manual |
| E2E-019 | `duaer-tasks` defaults to verification tasks; converge needs evidence | manual |
| E2E-020 | Accept may stamp `delivery.json.verification` | manual |

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
| E2E-016 | Extra host adapters | Copilot+Windsurf+Cline+… |
| E2E-017 | `testing.md` | Verification contract |
| E2E-018 | AGENTS §3 / workflow R3 | Risk-based run |
| E2E-019 | `duaer-tasks` / `duaer-converge` | Default verify |
| E2E-020 | `delivery.json` | Verification evidence |
