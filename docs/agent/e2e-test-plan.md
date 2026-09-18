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
| E2E-079 | Result versions: each accept adds a previewable version; unified list; worktree gone keeps only openable snapshots; CTA is 查看结果; finished job does not stick on 续派中 | `npm test` + manual / curl |
| E2E-025 | Deploy-needed jobs use `gh` + Actions (not third-party host CLIs by default) | manual |
| E2E-026 | English docs contain no CJK; Chinese docs may include English | manual |
| E2E-027 | After preview, feedback revise relaunches agent on same worktree | manual / curl |
| E2E-028 | Revise uses left-chat dialogue then confirm; Terminal uses --continue | manual / curl |
| E2E-029 | Accept failure shows Auto-fix; fix then re-accept | manual / curl |
| E2E-030 | CLI/live notify when npm has newer `duaer-spec`; `npm i -g duaer-spec@latest` / `duaer self-update` upgrades global CLI | manual / curl |
| E2E-080 | Dispatch picks planned host (Cloudflare/阿里云/AWS/GitHub Pages); Cloudflare constrains code; tasks split finely with no max-12 cap | `npm test` + manual |
| E2E-031 | After revise confirm, right card stays locked 改进卡; chat busy ≠「续派中」 | manual |
| E2E-032 | Dispatch/browse installs Duaer in the chosen directory (no silent redirect) | manual |
| E2E-033 | Revise: original brief visible; preview kept; Terminal queue reuse | manual |
| E2E-034 | Live detects agent/claude under ~/.local/bin even with launchd PATH | manual |
| E2E-035 | After handoff removes worktree, status/preview work; revise recreates wt | manual |
| E2E-036 | Confirm card unchanged; revise card stays in bottom panel | manual |
| E2E-037 | Preview/revise CTAs hidden until delivery accepted | manual |
| E2E-038 | Live desk language switch (zh-CN / en) updates copy; reload keeps locale | manual |
| E2E-039 | After accept, revise confirm starts agent (fresh session if needed); stale runner opens new Terminal; revise card uses dark plate style | manual |
| E2E-040 | Live desk: left chat + right card stay viewport-aligned; right auto-scrolls to active stage on real stage changes — not on every status poll; manual scroll in 需求/运行 is held ~12s | manual |
| E2E-041 | Busy Terminal runner: revise/dispatch enqueue waits (no interrupt) while job is still in progress; after accept, see E2E-047 | manual |
| E2E-042 | Wide desk layout; FIFO jobs/ queue auto-runs next task after running.cmd finishes | manual |
| E2E-043 | Progress panel has no harsh gray/white slab; matches desk plate; readable 进行中 line | manual |
| E2E-044 | Duaer-spec FED「项目」: header Projects button; drawer create/select project; chats listed under active project; restore loads job | `npm test` + `npm run test:live` + manual |
| E2E-079 | Project-first: chat/Send locked until active project; `/api/projects` + activate; confirm stamps projectPath; parent folder UI in project drawer | `npm test` + `npm run test:live` |
| E2E-080 | Project create requires title + background description; list shows both | `npm test` + `npm run test:live` |
| E2E-081 | Project chat persists under `~/.duaer/live/project-chats/`; refresh restores messages | `npm test` + `npm run test:live` |
| E2E-082 | Project desk session also restores requirements card + jobId/progress after refresh | `npm test` + `npm run test:live` |
| E2E-083 | After refresh, previously passed auto-validate keeps Confirm enabled | `npm test` + `npm run test:live` |
| E2E-084 | Requirements fields edit as structured rows (add/remove), not raw textarea | `npm test` + `npm run test:live` |
| E2E-085 | Setup 说明 covers Cursor/Claude install + other model wiring; header Model/Settings reopens it; setup.hint names Duaer desk model; guideDoc links locale-specific GitHub worker-models | `npm test` + `npm run test:live` |
| E2E-086 | After Confirm, architecture dialogue + Archify HTML under hosting (no diagram-container height clip; every node click zooms + shows semantic passport popup in embed); gate dispatch; revise confirms plan then re-confirms architecture before dispatch; ready chat says diagram is under hosting; Confirm architecture clickable after render | `npm test` + `npm run test:live` |
| E2E-087 | After「派工并用…启动」succeeds, button stays「已派工」(persisted + restored from status); refresh / client timeout does not re-enable first launch | `npm test` + `npm run test:live` |
| E2E-088 | After accept, Result panel always visible (查看结果 and/or 打开项目目录); progress column mirrors CTA; no-page jobs still show open-folder | `npm test` + `npm run test:live` |
| E2E-089 | Revise keeps confirmed architecture; re-confirm only when architecture changes; prior diagram stays above new | `npm test` + `npm run test:live` |
| E2E-090 | Accepted delivery always has openable preview (page or http://localhost service); missing index.html alone does not hide 打开看看 | `npm test` + `npm run test:live` |
| E2E-091 | 打开看看 starts localhost service if needed then opens; 打开文件夹 kept; plain-language result copy | `npm test` + `npm run test:live` |
| E2E-092 | Revise dialogue + 改进卡 restore after refresh; kickoff/lock persist reviseMessages | `npm test` + `npm run test:live` |
| E2E-094 | Result panel: one heading + listen status + start when down; open/folder/revise in one row; no Progress duplicate | `npm test` + `npm run test:live` + manual |
| E2E-095 | New/empty project clears full desk (chat + 需求 + 运行/结果); prior project session still restores | `npm run test:live` + manual |
| E2E-096 | Progress/运行 column long status and task lines wrap inside the panel (no horizontal spill) | `npm run test:live` + manual |
| E2E-097 | Result bar is one compact row (heading + actions; listen/start only for localhost) | `npm run test:live` + manual |
| E2E-098 | Result bar buttons stay horizontal; heading/current chip follow latest revision | `npm run test:live` + manual |
| E2E-099 | 改进卡 is versioned: each dispatched revision keeps its card; 再改一版 opens next empty card; chips browse history without overwrite | `npm test` + `npm run test:live` + manual |
| E2E-100 | Revise: confirm 改进方案 first, then re-confirm architecture (keep or redesign), then dispatch | `npm test` + `npm run test:live` + manual |
| E2E-101 | Desk buttons: no undefined --muted; architecture confirm/redesign row aligned; revise CTA not offset | `npm run test:live` + manual |
| E2E-102 | Requirement versions accordion: 初版 + 第N版 expand with fields; architecture shown when changed | `npm test` + `npm run test:live` + manual |
| E2E-103 | 再改一版 switches chat to revise thread so user-sent revise messages are visible | `npm run test:live` + manual |
| E2E-104 | 再改一版 / version accordion clicks respond (no busy-disable swallow; accordion not rebuilt every poll) | `npm run test:live` + manual |
| E2E-105 | Desk `.btn` chrome complete: flex center, `[hidden]` stays hidden, preview/revise/arch actions styled | `npm run test:live` + manual |
| E2E-106 | 再改一版 posts visible user message into revise dialogue then kicks off employee | `npm run test:live` + manual |
| E2E-107 | 再改一版 reacts on first click (chat focus + kickoff before chrome; no accepted flip) | `npm run test:live` + manual |
| E2E-108 | Revise kickoff keeps streamed model reply; safe chat done SSE (no stack-overflow wipe) | `npm run test:live` + manual |
| E2E-109 | 再改一版 never shows Maximum call stack; persist/SSE omit deep IR | `npm run test:live` + manual |
| E2E-110 | Architecture embed node click shows Archify semantic passport (`.focus-chip`) popup | `npm test` + manual |
| E2E-111 | Served architecture HTML upgrades stale `#duaer-embed-fit` so passport CSS applies | `npm test` + manual |
| E2E-112 | Architecture embed passport sits 100px left and 100px up from prior inset | `npm test` + manual |
| E2E-113 | Architecture embed passport stays in-view (left flush, top 100px, high z-index) | `npm test` + manual |
| E2E-114 | Architecture passport offset 100px via gutter padding without iframe clip | `npm test` + manual |
| E2E-115 | Architecture passport expands fully with no inner scroll; iframe grows | `npm test` + manual |
| E2E-116 | README EN/ZH show Duaer-spec FED brand SVG from desk header | manual |
| E2E-117 | 再改一版 kickoff shows real error; no right-panel focus race during stream | `npm run test:live` + manual |
| E2E-118 | Desk drops deep architecture IR after render (viewBox/fingerprint only); dispatch loads IR from disk; revise SSE omits jsonBlock | `npm run test:live` + manual |
| E2E-119 | 再改一版 kickoff skips heavy chrome; no false「架构图序列化爆栈」; chrome after success only | `npm run test:live` + manual |
| E2E-120 | reviseCardValues must not recurse via stashReviseDraftFromFields (kickoff-stringify stack) | `npm run test:live` + manual |
| E2E-121 | After 改进方案确认, architecture panel sits below「请先确认架构」CTA | `npm run test:live` + manual |
| E2E-122 | Architecture canvas expands to full diagram height (no iframe); node passport via Shadow mount | `npm test` + `npm run test:live` + manual |
| E2E-123 | Architecture mounts inline (Shadow DOM), not iframe; GET `.json` for passport | `npm test` + manual |
| E2E-124 | Inline mount keeps full Archify FX (theme CSS, motion, focus-chip, zoom) | `npm test` + manual |
| E2E-125 | Node click boots Archify viewer (full body mount) → focus-chip + zoom | `npm test` + manual |
| E2E-093 | Header top actions share one button chrome; GitHub control links to duaer-spec and shows live stars via `/api/github` | `npm run test:live` + manual |
| E2E-063 | Duaer-spec FED brand: header/title show Duaer-spec FED; zh secondary mark is the Chinese product name; en mark is Field Engineering Desk; setup hint / desk-model guide name Duaer | `npm test` + manual |
| E2E-078 | Claude Terminal launch includes `--permission-mode bypassPermissions` and stamps `hasTrustDialogAccepted` for the worktree | `npm test` + manual |
| E2E-077 | Missing product path auto-created; projectsRoot saves parent; relative name creates under parent | `npm test` + manual |
| E2E-076 | Worker CLIs are Cursor Agent + Claude Code only; no deepseek-tui worker; tutorial docs/agent/worker-models(.zh-CN).md | `npm test` + manual |
| E2E-075 | DeepSeek Terminal launch uses `deepseek -w <worktree> --yolo` (not `--workspace`); job exits 0 when CLI present | `npm test` + manual |
| E2E-074 | Missing git: auto-install then init; worker CLIs versioned; 10-day auto-upgrade stamp under `~/.duaer/cli-tools-check.json` (opt-out `DUAER_NO_CLI_UPGRADE=1`) | `npm test` + manual |
| E2E-073 | Progress column: run cards + meter + checklist styling; empty state title/hint | `npm run test:live` + manual |
| E2E-072 | Sticky top nav; three desk columns equal height; card-panel (middle) and siblings scroll internally | `npm run test:live` + manual |
| E2E-071 | Choice chips use muted (non-orange) styling; still clickable | `npm run test:live` + manual |
| E2E-070 | Dispatch into a product repo when `.worktree/feat-<slug>` already exists allocates a new branch/worktree (e.g. feat/html-043) instead of failing `worktree 已存在` | `npm test` + manual |
| E2E-069 | Choice questions show clickable chips (tap sends); ready bubble has starter chips; `.mjs` option enrich when JSON omits options | `npm test` + `npm run test:live` + manual |
| E2E-068 | Header has no beginner slogan; chat empty has steps only (no emptyTitle flash) | `npm run test:live` + manual |
| E2E-067 | Live serves `.mjs` as `text/javascript`; desk module graph loads; send shows chat bubbles | `npm run test:live` |
| E2E-066 | Chat empty state shows three structured steps (plain words → confirm/dispatch → acceptance delivery); locale switch updates step copy | `npm run test:live` + manual |
| E2E-065 | Chat send: after Confirm / History restore, Send/Enter still posts chat; locked specify card fields are not overwritten; busy/not-ready shows a bot notice (not silent) | `npm run test:live` + manual |
| E2E-064 | FED UX polish: chat empty state, accented FED brand, opaque history drawer, stronger primary CTA | `npm test` + manual |
| E2E-045 | Desk layout: compact header, history as side drawer (does not push columns), calm two-column desk | manual |
| E2E-046 | Revise dispatch always returns: a stuck child (e.g. blocking `post-checkout` hook on `git worktree add`) yields HTTP 504 with an actionable message within its budget instead of hanging, so the button never sits on「续派中…」forever; normal revise still enqueues into `.duaer/live-terminal/jobs/` | manual / curl |
| E2E-047 | After delivery accepted, revise while first agent still holds `running.cmd`: `POST /api/revise` preempts leftover CLI, enqueues revise, and Terminal drains the revise job (not forever behind the accepted first agent); pre-accept busy revise still waits without interrupt | manual / curl |
| E2E-048 | PriorAccepted preempt also TERM→KILL worktree `agent`/`cursor-agent`/`claude` orphans (match worktree path + CLI name; never kill `runner.command`); every signaled PID logged; revise agent runs Revision prompt with no leftover first-Brief orphan | manual / curl |
| E2E-049 | Progress ownership: each dispatch/revision has its own run block under the revise/dispatch stack (timeline below); older blocks stay frozen with their revision; no single progress pile above preview/revise | manual |
| E2E-050 | Live desk three columns: chat widest, middle requirements/confirm/dispatch/revise, far-right task progress alone (run timeline not inside requirements column) | manual |
| E2E-051 | Validate-before-send: Confirm and revise-dispatch stay blocked until `/api/validate` passes for current card fields; fail shows issues + auto-fix; agent launch prompt forbids Confirming-intent / multi-choice re-confirm | manual |
| E2E-052 | Confirm column wider than chat; requirements fields expand in structured view with click-to-edit; middle column scrolls internally when content is tall | manual |
| E2E-053 | Full-screen desk (no 1440 shell cap); chat column ~50px wider than prior confirm-wide min; confirm still wider than chat | manual |
| E2E-054 | Live L3 smoke: `npm run test:live` covers desk shell markers + validate fail/pass + validate/fix via mock LLM (no paid API) | `npm run test:live` |
| E2E-055 | Revise reliability: preempt failure returns `PREEMPT_FAILED` without locking card; failed launch rolls back Brief Revision; status shows Terminal busy/queue; retry stays available | `npm test` + manual |
| E2E-056 | Progress on accept: status never shows `0/N · delivery accepted`; unchecked tasks reconciled to `[x]` | `npm test` |
| E2E-057 | After Confirm revise, progress tracks this revision’s `R{n}-*` tasks (not prior T* / frozen accepted); busy Terminal + lagging revisionCount still scopes correctly | `npm test` + manual |
| E2E-058 | priorAccepted revise: preempt clears leftovers then enqueue; false `PREEMPT_FAILED` must not appear while that revise Agent is already running; hard fail leaves nothing queued | `npm test` + manual |
| E2E-059 | Satisfactory delivery gate: vague acceptance fails `/api/validate`; checkable acceptance can pass; README leads with norms → satisfactory delivery | `npm test` + manual |
| E2E-060 | ~~DeepSeek TUI worker~~ superseded by E2E-076 (desk LLM only; workers = Cursor / Claude) | — |
| E2E-061 | Missing CLI chips show install command + copy panel; Redetect refreshes `/api/agents` | `npm test` + manual |
| E2E-062 | Detailed coding progress: dispatch `tasks.md` has ≥6 boxes; status `activity` lists worktree file changes; progress column shows activity under summary | `npm test` + manual |
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
| E2E-056 | `057-progress-accepted` | accept never shows 0/N |
| E2E-057 | `058-revise-progress-track` | revise scopes R{n} progress |
| E2E-058 | `059-revise-preempt-order` | preempt before enqueue |
| E2E-059 | `061-satisfactory-delivery` | checkable acceptance gate |
| E2E-060 | `062-deepseek-cli` | DeepSeek TUI as worker CLI |
| E2E-061 | `064-cli-install-show` | missing CLI install cmds |
| E2E-062 | `065-detailed-progress` | fine tasks + worktree activity |
| E2E-063 | `066-duaer-fed` | Duaer-spec FED brand |
| E2E-074 | `082-git-cli-ensure` | git auto-install + 10d CLI upgrade |
| E2E-075 | `083-deepseek-w-flag` | DeepSeek `-w` not `--workspace` |
| E2E-076 | `084-drop-deepseek-cli` | drop deepseek worker; model tutorial |
| E2E-077 | `085-repo-mkdir` | create missing product dirs + projectsRoot |
| E2E-078 | `086-claude-auto-perms` | Claude bypassPermissions on dispatch |
| E2E-079 | `090-project-first` | project-first desk; chats under project |
| E2E-080 | `091-project-meta` | project title + background description |
| E2E-081 | `095-project-chat-persist` | persist project desk chat |
| E2E-082 | `096-project-card-persist` | persist requirements card + job |
| E2E-083 | `097-validate-persist` | persist validate gate for Confirm |
| E2E-084 | `098-req-structured-edit` | structured requirements edit |
| E2E-085 | `099-setup-cli-guide` | setup guide CLI + other models |
| E2E-086 | `100-architecture-archify` | Archify architecture before dispatch |
| E2E-087 | `117-dispatch-done-state` | dispatch button stays finished |
| E2E-088 | `118-preview-result-visible` | result panel + open folder after accept |
| E2E-089 | `119-arch-revise-keep` | revise keeps prior architecture |
| E2E-090 | `120-preview-required` | preview.url required (page or service) |
| E2E-091 | `121-preview-start-service` | ensure+open local preview service |
| E2E-092 | `122-revise-chat-persist` | restore revise dialogue on reload |
| E2E-093 | `124-header-github-stars` | uniform header actions + GitHub stars |
| E2E-094 | `125-result-service-status` | result panel listen status + one-click start |
| E2E-095 | `126-new-project-full-reset` | new project resets chat + requirements + run |
| E2E-096 | `127-progress-text-overflow` | progress column text stays inside panel |
| E2E-097 | `129-result-one-line` | result panel one-line bar |
| E2E-098 | `130-result-bar-layout` | result buttons + follow-latest version |
| E2E-099 | `131-revise-card-versions` | versioned 改进卡 history + next draft |
| E2E-100 | `132-revise-arch-after-plan` | architecture confirm after revise plan |
| E2E-101 | `133-button-styles` | fix missing/misaligned button styles |
| E2E-102 | `134-revise-version-expand` | expandable requirement versions + arch |
| E2E-103 | `135-revise-chat-visible` | revise chat shows user messages |
| E2E-104 | `136-revise-click` | fix dead 再改一版 / accordion clicks |
| E2E-105 | `137-btn-chrome` | complete button chrome + hidden display |
| E2E-106 | `138-revise-send-msg` | 再改一版 visible user chat message |
| E2E-107 | `139-revise-first-click` | 再改一版 first-click kickoff + chat focus |
| E2E-108 | `140-revise-kickoff-stack` | keep model reply; safe done SSE |
| E2E-109 | `141-revise-stack-2` | never surface call-stack; omit deep IR |
| E2E-110 | `142-arch-node-popup` | restore Archify focus-chip passport in embed |
| E2E-111 | `143-arch-popup-upgrade` | replace stale embed-fit CSS on serve |
| E2E-112 | `144-arch-popup-offset` | passport left/top −100px |
| E2E-113 | `145-arch-popup-visible` | passport in-view top 100px |
| E2E-114 | `146-arch-popup-gutter` | 100px gutter offset without clip |
| E2E-115 | `147-arch-expand-noscroll` | passport expand, no inner scroll |
| E2E-116 | `149-docs-brand-logo` | README brand mark SVG |
| E2E-117 | `150-revise-kickoff-err` | revise kickoff real error + no focus race |
| E2E-118 | `151-revise-ir-stack` | drop deep IR after render; resolve from disk |
| E2E-119 | `152-revise-kickoff-lite` | lite kickoff; chrome after success |
| E2E-120 | `153-kickoff-stringify` | break reviseCardValues↔stash recursion |
| E2E-121 | `154-revise-arch-order` | arch panel after 请先确认架构 CTA |
| E2E-122 | `155-arch-canvas-expand` | canvas expands; no iframe scroll |
| E2E-123 | `156-arch-inline-mount` | Shadow DOM mount; no iframe |
| E2E-124 | `157-arch-mount-fx` | full Archify styles + viewer FX |
| E2E-125 | `158-arch-click-fx` | full body mount; click passport + zoom |
