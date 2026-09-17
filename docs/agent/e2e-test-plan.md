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
| E2E-021 | `duaer live` stream + auto-accept + CLI dispatch (Terminal agent/claude) | manual / curl |
| E2E-022 | Live desk detects agents and launches selected digital employee | manual / curl |
| E2E-023 | Live desk shows task progress from dispatched Brief tasks.md | manual / curl |
| E2E-024 | Live desk shows preview link when delivery accepted | manual / curl |
| E2E-025 | Deploy-needed jobs use `gh` + Actions (not third-party host CLIs by default) | manual |
| E2E-026 | English docs contain no CJK; Chinese docs may include English | manual |
| E2E-027 | After preview, feedback revise relaunches agent on same worktree | manual / curl |
| E2E-028 | Revise uses left-chat dialogue then confirm; Terminal uses --continue | manual / curl |
| E2E-029 | Accept failure shows Auto-fix; fix then re-accept | manual / curl |
| E2E-030 | CLI/live notify when npm has newer `duaer-spec`; `duaer self-update` upgrades global CLI | manual / curl |
| E2E-031 | After revise confirm, right card stays locked 改进卡; chat busy ≠「续派中」 | manual |
| E2E-032 | Dispatch/browse installs Duaer in the chosen directory (no silent redirect) | manual |
| E2E-033 | Revise: original brief visible; preview kept; Terminal queue reuse | manual |
| E2E-034 | Live detects agent/claude under ~/.local/bin even with launchd PATH | manual |
| E2E-035 | After handoff removes worktree, status/preview work; revise recreates wt | manual |
| E2E-036 | Confirm card unchanged; revise card stays in bottom panel | manual |
| E2E-037 | Preview/revise CTAs hidden until delivery accepted | manual |
| E2E-038 | Live desk language switch (zh-CN / en) updates copy; reload keeps locale | manual |
| E2E-039 | After accept, revise confirm starts agent (fresh session if needed); stale runner opens new Terminal; revise card uses dark plate style | manual |
| E2E-040 | Live desk: left chat + right card stay viewport-aligned; right auto-scrolls to active stage (dispatch/progress/preview/revise) | manual |
| E2E-041 | Busy Terminal runner: revise/dispatch enqueue waits (no interrupt) while job is still in progress; after accept, see E2E-047 | manual |
| E2E-042 | Wide desk layout; FIFO jobs/ queue auto-runs next task after running.cmd finishes | manual |
| E2E-043 | Progress panel has no harsh gray/white slab; matches desk plate; readable 进行中 line | manual |
| E2E-044 | Live desk history: header row has Live desk + flow tag; History lists past jobs; restore loads job | manual |
| E2E-045 | Desk layout: compact header, history as side drawer (does not push columns), calm two-column desk | manual |
| E2E-046 | Revise dispatch always returns: a stuck child (e.g. blocking `post-checkout` hook on `git worktree add`) yields HTTP 504 with an actionable message within its budget instead of hanging, so the button never sits on「续派中…」forever; normal revise still enqueues into `.duaer/live-terminal/jobs/` | manual / curl |
| E2E-047 | After delivery accepted, revise while first agent still holds `running.cmd`: `POST /api/revise` preempts leftover CLI, enqueues revise, and Terminal drains the revise job (not forever behind the accepted first agent); pre-accept busy revise still waits without interrupt | manual / curl |
| E2E-048 | PriorAccepted preempt also TERM→KILL worktree `agent`/`cursor-agent`/`claude` orphans (match worktree path + CLI name; never kill `runner.command`); every signaled PID logged; revise agent runs Revision prompt with no leftover first-Brief orphan | manual / curl |
| E2E-049 | Progress ownership: each dispatch/revision has its own run block under the revise/dispatch stack (timeline below); older blocks stay frozen with their revision; no single progress pile above preview/revise | manual |
| E2E-050 | Live desk three columns: chat widest, middle requirements/confirm/dispatch/revise, far-right task progress alone (run timeline not inside requirements column) | manual |
| E2E-051 | Validate-before-send: Confirm and revise-dispatch stay blocked until `/api/validate` passes for current card fields; fail shows issues + auto-fix; agent launch prompt forbids Confirming-intent / multi-choice re-confirm | manual |
| E2E-052 | Confirm column wider than chat; requirements (and revise) fields fully expanded without inner scroll; structured paragraphs/lists display with click-to-edit | manual |
| E2E-053 | Full-screen desk (no 1440 shell cap); chat column ~50px wider than prior confirm-wide min; confirm still wider than chat | manual |
| E2E-054 | Live L3 smoke: `npm run test:live` covers desk shell markers + validate fail/pass + validate/fix via mock LLM (no paid API) | `npm run test:live` |
| E2E-041 | Busy Terminal runner: revise/re-dispatch queues (`pending.cmd`), waits (no interrupt); API `queued`/`busy`/`reused`; UI does not claim agent already started | manual |
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
| E2E-011 | DUADER + agent docs | Update path in installed guides |
| E2E-012 | `README.zh-CN.md` | Chinese guide |
| E2E-013 | AGENTS / branching naming | Avoid double `<nnn-slug>` |
| E2E-014 | Claude + Cursor install | Dual host |
| E2E-015 | Codex `.agents/skills` | Triple host |
| E2E-016 | Extra host adapters | Copilot+Windsurf+Cline+… |
| E2E-017 | `testing.md` | Verification contract |
| E2E-018 | AGENTS §3 / workflow R3 | Risk-based run |
| E2E-019 | `duaer-tasks` / `duaer-converge` | Default verify |
| E2E-020 | `delivery.json` | Verification evidence |
| E2E-021 | live 008–010 | Desk → product |
| E2E-022 | `011-live-agent-launch` | Detect + launch |
| E2E-023 | `012-live-dispatch-progress` | tasks.md progress |
| E2E-024 | `022-live-preview-link` | delivery preview |
| E2E-025 | `023-gh-deploy-docs-lang` | `gh` + Actions deploy |
| E2E-026 | `023-gh-deploy-docs-lang` | EN docs language purity |
| E2E-027 | `024-live-revise-feedback` | revise after preview |
| E2E-028 | `025-revise-dialogue-continue` | dialogue + `--continue` |
| E2E-029 | `026-auto-fix-accept` | accept fail → auto-fix |
| E2E-030 | `029-self-update` | CLI/live update check + `self-update` |
| E2E-031 | `030-revise-card-ui` | revise card locked after dispatch |
| E2E-032 | `031-dispatch-init` | init Duaer in chosen product dir |
| E2E-033 | `032-revise-ux` | original brief + preview + Terminal reuse |
| E2E-034 | `033-agent-detect` | CLI detect under launchd PATH |
| E2E-035 | `034-stale-worktree` | handoff-cleaned worktree recover |
| E2E-036 | `035-revise-card-below` | revise card below confirm card |
| E2E-037 | `036-progress-cta` | hide preview/revise until accepted |
| E2E-038 | `037-live-i18n` | locale switch + persist |
| E2E-039 | `038-revise-enqueue-style` | honest enqueue + dark revise card |
| E2E-040 | `039-desk-scroll-sync` | left/right viewport sync |
| E2E-041 | `040-terminal-queue-wait` | busy queue wait + honest API/UI |
