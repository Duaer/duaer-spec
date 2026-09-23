# Changelog

## Unreleased

### Fix: creating a project no longer reuses an existing directory

- Create mode refuses when the target folder already exists on disk
- Open an existing project from the list or browse; do not create over it
- Hint copy tells the operator to rename or open the existing project

### Feat: FDE-08 performance budget before confirm

- Feature confirm must name LCP, INP, bundle size, virtualized long lists, a weak-network check, and a large-data check
- A vague speed line such as "pretty fast" fails local validate
- Modules with no page performance requirement may write that opt-out
- Kickoff schedules the budget before implement, after the environment probe, data precheck, and external-dependency board when those exist
- The desk records the budget; it does not run a customer performance lab

## 0.27.1 — 2026-09-21

### Feat: FDE-05 external dependency board before kickoff

- Feature confirm requires a blocker, SLA, backup mock, and parallel path,
  or an explicit no-dependency opt-out
- Kickoff adds that board before implement when a third party, ERP, or SSO
  is declared

### Feat: FDE-06 import precheck before kickoff

- Feature confirm requires a field mapping, an import failure list, and an
  export for cleanup, or an explicit no-import opt-out
- Kickoff adds a data-precheck task before implement when an import is
  declared

### Feat: FDE-03 environment checklist before kickoff

- Feature confirm requires DNS, TLS, CORS, auth, and third-party reachability
  recorded as passed, or an explicit no-customer opt-out
- A failed probe blocks confirm
- Kickoff adds an environment-probe task before implement when a customer
  environment is declared

### Feat: FDE-04 browser matrix must include evidence

- Device matrix needs two named browsers or domestic clients, screenshot or
  cloud evidence, and a polyfill or fallback
- Kickoff adds a compat-evidence task per confirmed module

### Docs: fast iteration uses patch versions

- Default ship bump is the last number (`0.27.1`, `0.27.2`, …)
- Next release after `0.27.0` is `0.27.1`; do not jump the minor on every ship

## 0.27.0 — 2026-09-21

### Feat: FDE-07 UAT pack on confirm

- Feature exception cases must cover empty, failure, permission, timeout, and retry
- A declared API contract also requires an error code or HTTP status in that text
- Kickoff adds a UAT task per confirmed module

### Fix: keep baseline confirm fields after desk refresh

- Restoring a project session copies device matrix, critical paths, exception
  cases, and API contract back onto the confirm card

### Feat: FDE-02 API contract gate on confirm + kickoff tasks

- Feature confirm requires `apiContract` (OpenAPI/types path or「本模块无 HTTP API」)
- Kickoff injects contract sync / Mock / CI contract-test tasks when a path is declared
- Deliverables and baseline fingerprint include the field

### Fix: pass FDE-01 baseline fields through chat SSE

- `parseChatResult` / `chatDoneSsePayload` keep deviceMatrix, criticalPaths,
  exceptionCases so the middle confirm card fills from chat JSON

### Fix: guide filling FDE-01 baseline confirm fields

- Feature chat / accept / fix / revise prompts include device matrix, critical
  paths, and exception cases (fill defaults or offer options — do not leave empty)
- Confirm card placeholders show examples instead of bare「待确认」

### Fix: auto-route architecture edges that cross unrelated nodes

- Before Archify deliver, long same-row edges that would pass through other
  components get a bottom `via` detour (`clean-flow/edge-through-node`)

### Docs: README covers FDE-01 baseline sign

- zh-CN / en README: feature confirm fields, signed baseline before kickoff,
  change order, deliverables baseline history

### Feat: FDE-01 signed scope + acceptance baseline before kickoff

- Confirm card requires device matrix, critical paths, and exception cases (feature)
- Dispatch requires a signed baseline (signer + fingerprint); change order clears sign and reopens confirm
- Deliverables page shows baseline sign-off and change history

## 0.26.0 — 2026-09-20

### Fix: npm provenance repository URL after GitHub move

- `package.json` repository / bugs / homepage point at `Duaer/duaer-spec`
  so Trusted Publishing provenance matches the Actions OIDC subject


### Feat: speech recognition (STT) model for composer Record

- Settings: configure STT Base URL / API Key / Model (OpenAI-compatible
  `/audio/transcriptions`, e.g. whisper-1)
- Record captures audio; stop decodes via `/api/transcribe` into the composer
- When STT is unset, Record guides the operator to Settings

### Feat: composer Record to collect requirements by speech

- Voice control beside Send fills the chat input via browser SpeechRecognition
- Listening state visible; unsupported / denied mic shows a short bot notice

### Feat: dispatch center can view system architecture per project

- Stage tabs: Dispatch graph | Architecture
- Architecture loads that project’s saved `architecture.url`; empty hint when missing
- Fullscreen control removed from the architecture stage (open the saved URL)

### Fix: rename product surface 台面 → 控制台

- User-facing Chinese copy uses **控制台** (brand: **Duaer 控制台**)
- English parallel uses **console** (**Duaer console**) instead of desk
- DOM ids / `deskKind` / `live-desk.md` path unchanged

### Docs: Cursor + Claude Code primary; no professional workflow required

- README / ADOPT lead with Cursor and Claude Code; humans need not learn Spec
  phases or a professional delivery process
- Other editor adapters remain optional via `init` (not the primary pitch)

## 0.25.1 — 2026-09-20

### Fix: architecture chat must not keep a false “diagram ready” line

- When chat claims the diagram is ready but no renderable IR/URL arrives, the
  same assistant bubble is rewritten to the missing-diagram copy with
  Regenerate — the left chat no longer leaves a false “diagram ready” line
  without a middle-panel diagram
- Continue chips only clear when a render URL or real components exist

## 0.25.0 — 2026-09-20

### Feat: bug path, project timeline, and desk navigation

- Bug path: defect card → skip architecture by default → short pool → `fix/`
  (optional hotfix from `main`)
- Bug chat autofills project delivery context (URL / start scripts / env) instead
  of re-asking
- Bug CTA sits with Revise again on the result bar; CTAs stay after deploy
- Project timeline: initial / revision N / defect sorted by time (deliverables)
- Chat-edge quick nav jumps to chat bottom · confirm card · result · progress

### Feat / Fix: dispatch center and desk ops (also in this release)

### Fix: opaque sticky result bar

- Result bar fill is solid (plate + lock tint) so scrolled content does not bleed through

### Fix: move 修 bug CTA next to 再改一版

- Remove top kind chips; 「修 bug」uses the same bottom revise-cta slots

### Fix: restore dispatch graph + park result bar at bottom

- Snake-wrap odd bands and set connection `fromSide`/`toSide` so Archify accepts
  wrap edges (调度中心 no longer blank for long task pools)
- Result bar（结果 · 初版…）moves below revise and sticks to the middle-column bottom

### Fix: visible 需求 / 修 bug switch on the confirm card

- Middle column always shows kind chips before lock (not only empty-chat starters)

### Feat: merge project badge into one top-nav button

- One control shows the active project (or “no project”) and opens the project drawer
- Same control on the dispatch-center top nav

### Feat: bug dispatch path on Duaer desk

- Chat「我要修一个 bug」sets defect card; default skip architecture; short task pool
- Kickoff uses `fix/` from develop (optional hotfix from `main`)
- Feature modular + architecture path unchanged

### Feat: dispatch graph wraps columns and refreshes status live

- Long task chains wrap after 4 columns instead of one endless row
- Node tag/sublabel show progress; dispatch center polls job status and remounts

### Feat: dispatch center shares the desk top nav

- Same brand / 调度中心 / 项目 / 数字员工 / 设置 / language / GitHub row
- Brand returns to the desk; panel buttons open `/?open=…` drawers

### Fix: dispatch-center node click zooms again

- Stage view keeps Archify reveal and frames the clicked node (scale up to 2.6)
- Desk architecture embeds still open present instead of zooming in place

### Fix: dispatch center shows the graph on the page

- Battlefield fills the dispatch-center stage; node clicks stay there
- View graph opens the dispatch center instead of a second present window

### Fix: dispatch graph no longer requires /meta/repository

- Task nodes carry status on `tag` and worker on `sublabel`, not Archify `sources`
- Sanitize drops unpinned `sources` so render does not demand repository evidence

### Fix: open architecture / 派工图 via OS browser on :8787

- `POST /api/open-external` remaps localhost proxy ports onto `:8787` and runs OS `open`
- Desk client always canonicalizes with `toDeskExternalHref` (never proxy `window.location.origin`)
- Avoids Cursor IDE Browser proxy tabs (`:64074` etc.) mistaken for extra desks

### Feat: dispatch graph shows task run status on nodes

- Node colors + tags: 已完成 / 进行中 / 等待中 from live progress
- Click passport lists status (and worker / title); reopen graph refreshes status

### Fix: dispatch graph present does not zoom on node click

- 「查看派工图」opens `present=1&noz=1`: full canvas, passport stays, no camera enlarge

### Fix: dispatch graph opens Archify present fullscreen

- 「查看派工图」opens the same `?present=1` fullscreen canvas as system architecture
- Node click / passport works in present mode; dispatch-center stage fills the viewport

### Fix: FDE desk stays on port 8787 only

- Agents must not spawn alternate desk ports; LaunchAgent uses `DUAER_LIVE_NO_BROWSER`
- Occupied 8787 prints reuse/kickstart hint instead of inviting another port

### Fix: dispatch graph Archify edge spacing

- Task-pool IR column width 280px so Archify edges stay ≥24px after box widen
- Confirm failures post a chat bubble with the Archify error (not only a flash)

### Fix: confirm workers graph button spins until render finishes

- 「确认人数并生成派工图」shows a busy spinner while Archify renders
- 「查看派工图」enables only after a successful render

### Feat: decompose tasks then confirm workers before dispatch graph

- After architecture confirm, the desk decomposes atomic tasks (parallel marked) above Digital employees
- Recommends 1–4 workers from parallel width; confirm builds the dispatch graph
- Revise uses the same gate after architecture re-confirm

### Feat: all durable live desk state in SQLite

- Config, repos, live jobs, and project sessions live in `~/.duaer/live/desk.sqlite`
- Legacy `config.json` / `repos.json` / `jobs/*` / `project-chats/*.json` import on open
- Schema version 2; later releases migrate on open
- `architecture/` HTML stays a regenerable disk cache
- Live data is per-machine only — never packaged with duaer-spec

### Feat: desk project sessions in SQLite

- Project desk sessions live in `~/.duaer/live/desk.sqlite` (Node built-in `node:sqlite`)
- Existing `project-chats/*.json` import automatically on first desk open; JSON files are kept
- Schema is versioned; later duaer-spec releases run migrations on open
- Requires Node `>=22.5.0`

### Fix: new project no longer keeps the previous 派工进度

- Status poll ignores responses after the desk switches to another project (or clears jobId)

### Fix: requeue a released wave when the Terminal is idle

- An unchecked wave that was already released is enqueued again when nothing is running and the queue is empty

### Feat: dispatch center for the task graph

- Top bar and the dispatch card open `/dispatch-center.html` as its own page
- That page lists projects in a 100px rail and shows the selected project's graph

### Fix: finished wave releases the Terminal for the next job

- When a wave's tasks are checked and the next `--continue` is already queued, the desk preempts the leftover CLI instead of waiting for it to exit
- A session whose own wave is still open is not preempted
- A Terminal script that only `cat`s the prompt file (no `- T00N:` line) is still preempted when a job is waiting

### Fix: project activate click shows feedback in the drawer

- Missing path, name, or description is shown in the project drawer, not only in chat behind it
- The activate button disables while the switch is in flight
- The project drawer scrolls so the button stays reachable

### Feat: desk machine verify gate

- Before delivery can stay `accepted`, the desk runs `.duaer/memory/verify.json` in the worktree
- A failing or missing contract reopens `accepted` and records command, exit code, and output tail
- The all-tasks-done stamp-accept nudge is removed; `update` keeps an existing product `verify.json`

## 0.24.1 — 2026-09-19

### Docs: explain Functional regression digital employee

- READMEs add a three-role table with Functional regression duties and boundaries
- Employee drawer copy clarifies regression vs implement / deploy

## 0.24.0 — 2026-09-19

### Feat: common live-desk locales beyond zh/en/ja

- Language select adds 繁體中文 / 한국어 / Español / Português / Français /
  Deutsch / Русский / Tiếng Việt (full catalog parity with English)
- Browser language detection covers the new codes

### Feat: deploy digital employee + documented hosting options

- Employee directory adds **Deployer** (`role: deploy`); deploy tasks use that role
- Multi-worker puts deploy (with verify-l3) on the last lane
- READMEs list supported hosts: none / GitHub Pages / Cloudflare / 阿里云 / AWS

### Docs: drop meta labels from README feature headings

- Section titles are「我们有什么」/「What you get」without a meta tag in the title

## 0.23.1 — 2026-09-19

### Docs: plain-language feature overview in READMEs

- Chinese「我们有什么」and English「What you get」list desk + employee capabilities
  without jargon-first flow dumps

## 0.23.0 — 2026-09-19

### Fix: orchestration wave release no longer deadlocks on silent wait

- Next ready wave is FIFO-enqueued even when the Terminal lane is busy
- After a wave, agents exit the CLI session (no hang waiting for continue)

### Fix: architecture embed click opens fullscreen only

- Desk diagram click (capture) opens present fullscreen and does not zoom nodes
- Embed `reveal` zoom path disabled; focus-chip hidden on the mount

### Fix: projects parent folder picker frontmost + clickable path

- macOS folder dialog activates Finder so it is not buried behind the browser
- Pick is async (no spawnSync on the HTTP thread)
- Clicking the readonly parent path also opens the picker

### Feat: digital employee directory + role specialization

- Top bar **数字员工** drawer lists Implementer and Functional regression
- Kickoff tasks carry `role: implement | verify-l3`; multi-worker puts
  verify-l3 on the last lane; prompts include role blurbs

## 0.22.0 — 2026-09-19

### Feat: Japanese (ja) live desk locale

- Language select adds 日本語; catalog covers all en keys
- Deliverables API accepts `lang=ja`; dates / HTML `lang` use ja-JP

### Feat: atomic verifiable tasks with monitorable progress

- Constitution + duaer-do / duaer-tasks: decompose to one independently
  verifiable atom per checkbox; progress only via `- [ ]` / `- [x]`
- Kickoff task pool and preview graph split multi-line acceptance into
  one task per criterion so FDE can monitor and release waves

## 0.21.0 — 2026-09-19

### Feat: click architecture diagram for fullscreen present view

- User-facing hints explain layout / worker colors and click-to-fullscreen
- Click diagram (or「全屏查看」) opens Archify HTML with `?present=1` in a new tab

### Fix: 打开看看 prefers project start URL over docs paths

- Ignore non-HTML `delivery.preview.url` (e.g. `docs/**/*.md`) for primary open
- Prefer inferred localhost service over static HTML candidates when both exist
- Status preview / chat link stay on the runnable product URL

### Fix: 打开看看 opens the focused preview URL

- Result-bar open uses `lastPreviewUrl` for `/api/…` and public https; local
  services still go through `/api/preview/ensure` without overwriting focus
- Chat「打开看看」keeps same-origin `/api/…` hrefs (no baked host)

### Fix: task path diagram without redundant Archify labels

- Drop edge `depends` labels, legend cards, and subtitle on the kickoff task graph

### Feat: task execution graph uses Archify (same as architecture)

- Kickoff task path renders via `/api/architecture/render` + architecture mount
- Left-to-right layered layout and visual effect match the system architecture diagram
- Display edges are transitively reduced so Archify routing stays valid

### Feat: worker chips + task dependency execution graph

- Digital-employee count uses chip radiogroup (串行 / 并行 labels)
- Kickoff shows task path by dependsOn; colors follow worker lanes

### Fix: garbled chat preview links for /api/result URLs

- Stop nesting bare `/api/result/…` auto-links inside `http://host/api/result/…` hrefs
- Accepted bubble shows a single clean「打开看看」link

### Fix: clickable preview URL in accepted chat bubble

- Bare `http(s)://` and `/api/artifact|result/…` URLs become links in chat
- Accepted「打开看看」message uses a real `<a href>` (relative paths get an open chip)

### Fix: FDE dispatch must finish every task

- Kickoff / wave / continue / revise prompts forbid `Job not accepted yet` as a final handoff
- When all `tasks.md` boxes are checked but delivery is still open, status poll nudges stamp accept once
- `duaer-do`: live-dispatch jobs must stamp accepted before stopping

## 0.20.0 — 2026-09-19

### Feat: pick projects parent folder via system dialog

- 产品父目录 is read-only; **选择…** opens the native folder picker and saves
- **清除** empties `projectsRoot`; cancel leaves the previous path

### Fix: `duaer live` opens without model gate

- Desk starts and opens the browser even when no model is configured
- Settings guides model setup instead of blocking launch

### Feat: FDE portfolio status and delivery cockpit

- Project list shows delivery status chips and open-deliverables actions
- Progress column shows stage summary, next action, and deliverables CTA

## 0.19.0 — 2026-09-19

### Feat: modular `[模块]` structured requirement cards

- Accordion / confirm structured view splits `[title]` into section blocks
- Inline `1)…；2)` acceptance becomes numbered lists;顿号 out-of-scope → bullets

### Fix: requirements click-edit must not wipe fields

- Exiting edit without changes no longer clears the hidden textarea

### Feat: structured 初版 · 需求卡 accordion body

- Version accordion fields use the same `structuredHtml` path as confirm

### Fix: deliverables dossier layout

- Two-column layout: sticky TOC + white paper body
- Quieter stage/module chrome; left-aligned document hierarchy

### Fix: deliverables HTML content structure

- Numbered acceptance / out-of-scope chips / arrow flows parse into lists
- Task pool as checklist table; confirmation as registry (no duplicate cards)
- Module cards with clearer field layout

### Feat: reliable multi-worker task orchestration

- Kickoff / status poll only release ready waves (`dependsOn` satisfied via `[x]`)
- Idle lanes get `--continue` for the next wave; blocked lanes show 等依赖
- Assignment inherits first-dependency worker when possible

### Feat: multi-worker lanes in 派工进度

- When workerCount > 1, Progress shows one lane per digital employee
- Status `workers[]` includes tasks, state, and per-lane log tails

### Feat: structured deliverables page

- Contents TOC with stage / artifact anchors
- Confirmation cards as labeled field rows; bullets become lists

### Fix: architecture layout hang freezes desk

- Cyclic architecture connections no longer infinite-loop layout BFS
- Deliverables HTML uses local fonts (no Google Fonts fetch)

### Fix: architecture panel visibility

- Move「系统架构」out of planned-hosting chips into the middle column
- Server renders IR and returns `architectureUrl` on architecture chat
- Missing IR after「图已生成」shows regenerate CTA

### Fix: client-facing deliverables page (white dossier)

- Deliverables HTML uses a white, spacious client document look
- Drop FDE desk dark/orange palette from the customer-facing page

### Feat: stage deliverables HTML page

- Progress column **查看交付物** opens a generated standalone HTML page
- Stages: requirements (doc timeline + confirmation), architecture, kickoff, delivery, revise
- `GET /api/projects/deliverables?path=…&lang=zh|en`

### Fix: confirm button state for modular modules

- Stop rebuilding module tabs on every validate/input tick
- Tab switch re-validates the active module card
- After confirming one module, focus the next draft and refresh the button
- Clearing busy recomputes Confirm enablement (no permanent latch)

### Feat: modular FDE confirm and late kickoff

- Session holds `modules[]` + `activeModuleId`; chat can jump topics
- Per-module confirm locks one card; Brief / workers wait until kickoff
- After all modules confirmed: architecture → kickoff builds dependency task pool
- Default 1 worker; optional N parallel same-CLI workers (shared → w1; modules round-robin)
- Docs: README EN/ZH Flow + [`docs/agent/live-desk.md`](docs/agent/live-desk.md)

### Feat: parallel Terminal queue lanes

- `workerCount>1` uses `live-terminal` / `live-terminal/wN` so workers do not fight one lock

### Feat: README update on delivery

- Kickoff / revise prompts require product README update before `delivery.json` accepted

### Feat: chat Markdown render

- Desk chat bubbles render safe inline Markdown (`**bold**`, code, links)

### Fix: module tab active styling

- Active module tab uses register background so it reads as selected

### Fix: brand acronym FED → FDE

- Correct desk brand to **Duaer-spec FDE** (Field Development Environment / 现场开发)
- Rename brand SVG to `docs/assets/duaer-spec-fde.svg`

### Feat: compact settings with host tutorials

- Settings use collapsible blocks; denser spacing
- Short how-to for model / Cloudflare / 阿里云 / AWS credentials

### Feat: Cloudflare / AWS keys in FDE settings

- Settings: Cloudflare API Token + Account ID; AWS Access Key (+ optional Region)
- Cloudflare / AWS only appear in planned host / Deploy when credentials are set

### Feat: Alibaba Cloud keys in FDE settings

- Settings: AccessKey ID + Secret (local config only)
- 「阿里云」仅在凭证齐全时出现在计划托管 / 部署选择

### Fix: intro Pages layout

- Shared wrap column, text brand, 2x2 flow; drop ch-based Chinese max-width

### Feat: grander intro landing

- Larger brand hero, cinematic sky/grid motion, wider section rhythm on `site/`

### Feat: intro site on GitHub Pages

- Static landing at `site/` (Chinese-primary): brand, delivery flow, FED, install
- Workflow `.github/workflows/pages.yml` deploys `site/` from `main`

### Feat: deploy target picker

- Clicking「部署」opens「要部署到哪里？」(Cloudflare / 阿里云 / AWS / GitHub Pages)
- Confirm starts `/api/deploy` with the chosen host

### Feat: result-bar Deploy button

- 「打开看看」旁增加「部署」；暂不部署时默认 GitHub Pages
- `POST /api/deploy` 派出数字员工按计划托管上线并写回公网 preview.url

### Fix: architecture mount auto height

- Override Archify reader `100vh` / `100dvh` locks so the desk host grows with
  the SVG canvas instead of a black fixed viewport box

### Fix: architecture click FX (viewer boot)

- Mount full Archify body (toolbar nodes kept, visually hidden) so viewer init
  no longer throws on missing `#btn-preset`
- Preserve `#archify-fonts` style id; click opens focus-chip + zoom

### Fix: full Archify styles & FX in inline mount

- Mount full `.container` + Archify CSS/fonts into Shadow DOM (`.archify-root`)
- Run Archify viewer via scoped document proxy (real focus-chip + node zoom)
- Keep motion overlays; hide only desk-irrelevant chrome (toolbar/header)

### Feat: architecture diagram without iframe

- Mount Archify SVG in Shadow DOM (`architecture-mount`); same canvas + node passport
- Serve `/api/architecture/<key>.json` for passport data
- Accordion / previous / current diagrams share the same mount

### Fix: revise kickoff error visibility + focus race

- 「再改一版」shows the real failure reason (not only generic 启动失败)
- Defer right-panel chrome until after kickoff; stop status-poll focus steal

### Docs: Duaer-spec FED brand mark

- README (EN/ZH) open with the desk top-left brand SVG (`docs/assets/duaer-spec-fed.svg`)

## 0.18.0 — 2026-09-18

### Architecture node passport in FED embed

- Desk architecture iframe shows Archify `.focus-chip` on node click
- 100px upper-left gutter offset without clipping; passport expands fully
  (no inner scroll); iframe grows with the chip

### Revise dialogue reliability

- 「再改一版」posts the user message and kicks off on the first click
- Safe chat-done SSE / persist omit deep IR (no Maximum call stack wipe)
- Keep streamed model reply; never paint call-stack error copy

### Result bar: horizontal buttons + follow latest version

- Fix confirm `width:100%` squeezing action buttons into vertical glyphs
- Heading and current version chip track the latest revision

### Result panel one-line bar

- Heading + open / folder / revise on one row; no stacked meta or history label

### Claude FED launch: pre-accept folder trust

- Before Claude Terminal start, set `hasTrustDialogAccepted` for the worktree
  (and product root) in `~/.claude.json`

### Progress column text containment

- Long 运行 status / paths / tasks wrap inside the panel (no spill)

### New project resets full desk

- Switching to an empty project clears 需求 / 运行 / 结果, not only chat

### Result panel: listen status + one-click start

- Single result block (heading + service status + actions); drop Progress duplicate
- Localhost previews poll `/api/preview/status`; down → 启动服务

### Uniform header actions + GitHub stars

- Top-right controls share one button chrome (Projects / Settings / language / GitHub)
- GitHub opens `fujiezee/duaer-spec`; star count via cached `/api/github`

### Remove beginner slogan

- Drop 「小白也能做FED」 / 「Beginners can do FED too」 from top nav and leftover i18n

### Fix: Archify IR sanitize before render

- Strip chat/Brief extras (`goal`, `reply`, `type`, …) so Archify schema accepts IR

### Architecture design with Archify render

- After Confirm, desk runs an architecture dialogue for every job
- Renders interactive HTML via Archify (like https://tt-a1i.github.io/archify/)
- Diagram shows under planned hosting; dispatch waits for architecture confirm
- Requirements revise invalidates architecture until re-confirmed

### Setup guide: CLI install + other models

- FED「配置模型」页下方说明：Cursor / Claude 安装命令，以及其它模型接法
- Header **模型**可再打开说明；`worker-models` / README 同步

### Structured requirements editing

- Clicking a requirements field edits as structured rows (same look as display)
- Add / remove items; no more raw full-field textarea while editing

### Persist validate gate across refresh

- Auto-validate passed/failed state is stored with the project desk session
- Refresh restores Confirm enablement when the card fingerprint still matches

### Persist requirements card + task binding

- Project session file also stores confirm/revise card fields, `jobId`, and
  lock/mode flags
- Refresh / re-select restores the requirements card and resumes progress poll
  when a job is bound

### Persist project chat across refresh

- Desk messages are stored per project under `~/.duaer/live/project-chats/`
- Refresh / re-select restores the conversation; empty projects still auto-kickoff

### Dispatch shows current project only

- When a project is already selected, dispatch hides browse/path pickers and
  shows a short「当前项目」summary instead of「派工到当前项目」re-select UI

### Auto-start chat after project select

- Choosing / creating the current project immediately kicks off the
  requirements dialogue (includes project name + background)

### Harden project-before-chat gate

- Composer starts disabled; `sendChat` refuses without a current project
- Header badge shows「未选项目」or the active project name

### Project name + background

- Creating a project requires **项目名称** and a short **背景描述**
- Title and description persist in `repos.json` and show in the project list

### Project-first desk

- Top bar「历史」→「项目」; must select/create a product project before chat
- Drawer: create/open project (parent folder + name), list projects, chats under
  the current project (file store — no SQLite)
- Confirm stamps `projectPath`; dispatch defaults to the active project
- `activeProjectPath` persisted in `~/.duaer/live/config.json`

### Deploy target choice + fine tasks + self-update bootstrap

- Live dispatch: pick planned host (Cloudflare / Alibaba Cloud / AWS /
  GitHub Pages / none); agent prompts + `docs/agent/deploy-targets.md`
- Cloudflare choice encodes Workers/Pages coding constraints
- Task checklists: no hard max (was effectively capped); one acceptance line
  → one independently acceptable task
- Upgrade hint prefers `npm i -g duaer-spec@latest` (old CLIs lack
  `self-update`); `duaer upgrade` alias added

### Result versions + 查看结果

- Preview CTA renamed to **查看结果** / View result
- Each accepted dispatch/revision records a previewable version; desk lists
  versions; snapshots under the live job survive worktree cleanup
- Non-previewable dead links are pruned when the worktree is gone
- Status no longer sticks on `revising` /「续派中」after delivery accepted and
  work finished (or worktree cleaned)

## 0.17.0

### Claude auto permissions on dispatch

- Terminal Claude Code launches with `--permission-mode bypassPermissions` so
  the digital employee can edit/run without stopping for tool confirms

### Create missing product dirs + projects root

- Missing product path is created automatically before git init / dispatch
- Saved `projectsRoot` (desk「产品父目录」): relative names resolve and create
  under that parent

### Drop third-party DeepSeek worker CLI

- Live desk workers are **Cursor Agent** and **Claude Code** only
- DeepSeek remains the recommended **desk LLM** provider (chat / validate)
- Guide: [`docs/agent/worker-models.md`](docs/agent/worker-models.md) /
  [`docs/agent/worker-models.zh-CN.md`](docs/agent/worker-models.zh-CN.md)

### DeepSeek launch flag

- Terminal DeepSeek worker uses `-w <worktree>` (not Cursor `--workspace`),
  which the `deepseek` CLI rejects

### Git ensure + worker CLI 10-day upgrade

- Before product-repo `git init` / probe: verify `git` is installed; best-effort
  auto-install (`brew` / non-interactive `apt`/`dnf`/`yum`) then continue
- Worker CLIs (Cursor Agent / Claude Code / DeepSeek): version on `/api/agents`;
  every 10 days auto-check and best-effort upgrade (live start + before launch)
  via a **detached** `live-tooling --refresh-clis` child (does not block the desk);
  stamp `~/.duaer/cli-tools-check.json`; opt-out `DUAER_NO_CLI_UPGRADE=1`

### Beginner slogan

- Header line: 「小白也能做FED」 (was 「小白也能用 FED」)

### Progress column polish

- Run cards with active accent, done/total meter, clearer checklist rows,
  quieter empty state

### Equal-height desk columns

- Sticky top nav; three columns share remaining viewport height; chat /
  requirements / progress each scroll internally (middle column included)

### Quieter choice chips

- Chat option chips use muted plate/line styling instead of orange emphasis

### Unique dispatch worktrees

- Confirm branch hint is `feat/<jobId>` (unique per live job)
- Dispatch auto-allocates `feat/html-043` / `feat/html-2` when
  `.worktree/feat-html` (or the branch) is already taken — no more
  `worktree 已存在` hard fail on repeated same-slug goals

### Clickable chat choices

- Choice questions must ship `options` chips (tap to send); server/client also
  enrich chips from numbered / A-or-B reply text when JSON omits them
- Ready bubble offers starter chips; choice chips use a stronger go-affordance

### Header beginner line

- 「小白也能做FED」 moves to top-nav center (always on); chat empty keeps only
  the three how-to steps so the slogan no longer flashes away on load

### Live desk module MIME

- Serve `.mjs` as `text/javascript` so `structured-html.mjs` loads; desk chat
  UI works again in browsers that enforce module MIME types

### Structured chat empty steps

- Empty-state guidance is three numbered steps (plain words → confirm/dispatch
  → deliver to acceptance), not one semicolon-jammed hint line

### Chat send after confirm / restore

- Composer no longer silently ignores Send when the Brief is locked; chat stays
  open for dialogue while locked cards skip model field patches
- Send button tracks ready/busy; blocked attempts show a bot notice; Enter sends
  (Shift+Enter newline); stale busy clears after ~90s on retry

### Structured requirements display

- Middle confirm/revise fields split jammed `;` / `；` / `1、` text into list
  items with clearer visual blocks

### Auto-handle on validate fail

- Failed confirm/revise validation shows **Auto-handle** next to the fail hint; click narrates in chat and runs `/api/validate/fix`

### FED UX polish

- Clearer hierarchy: accented **FED** brand mark, stronger primary/confirm CTAs
- Chat and progress empty states; history drawer opaque plate surface
- Readable install/code chip surfaces on dark; selection + thin scrollbars

### Duaer-spec FED brand

- Correct product name to **Duaer-spec FED** (was briefly labeled Duaer FED)
- Live desk user-facing name is **Duaer-spec FED** (Field Engineering Desk);
  Chinese locale keeps the secondary on-site desk mark
- README, CLI help/banner, and agent prompts use Duaer-spec FED; `duaer live`
  command path unchanged

### Detailed coding progress

- Dispatch writes a finer `tasks.md` checklist (≥6 boxes from Goal/Acceptance;
  deploy adds another) instead of only T001–T003
- Revision checklists expand to ≥5 `R{n}-*` boxes from change/acceptance
- `/api/status` includes `activity` (git porcelain / changed files in the
  product worktree); progress column shows an activity line under the summary
- Agent prompts require expanding coarse lists and checking off small steps
- Longer `agent-launch.log` tail (24 lines) on status polls

### CLI install visibility

- Missing CLI chips show the install command on the chip; install panel + copy
  stay visible whenever any CLI is missing; **Redetect** refreshes PATH detection

### Fix

- Fresh Terminal open path no longer throws `queuedCount is not defined`

### DeepSeek CLI digital employee

- Live desk detects and launches **DeepSeek TUI** (`deepseek`) alongside Cursor
  Agent and Claude Code (`npm install -g deepseek-tui`)
- PATH discovery also checks npm global / nvm / `~/.cargo/bin` for LaunchAgent

### Norms → satisfactory delivery

- Positioning: README / DUADER / npm description lead with checkable Briefs that
  yield satisfactory delivery (not phase/skill operation)
- Stricter confirm/revise validate gate: vague acceptance (e.g. “looks better”)
  fails locally; checkable outcomes required
- Live desk acceptance hint + agent prompts emphasize meeting Acceptance and
  openable `preview.url`

## 0.16.0 — 2026-09-18

### Honest revise preempt

- priorAccepted revise preempts leftover Agents **before** enqueueing the new
  Terminal job (no false `PREEMPT_FAILED` while the revise Agent already runs)
- `PREEMPT_FAILED` only when leftovers remain — nothing queued for that attempt

### Revise progress tracking

- After Confirm revise, task progress scopes to the active `Revision N` checklist
  (not the prior dispatch’s completed `T*` pile)
- While revise is active (or Terminal is busy on open `R{n}` work), status does
  not freeze on the accepted “job complete” label
- Live `revisionCount` is inferred from Brief/`tasks.md` when the job stamp lags

### Progress sync when delivery accepted

- When `delivery.json` is `accepted`, task progress shows `N/N` (not `0/N` with
  an accepted label)
- Unchecked `tasks.md` boxes are reconciled to `[x]` on status poll after accept

### Revise round reliability

- Honest Terminal preempt: no false `preempted` / HTTP 200 when agents still run (`PREEMPT_FAILED`, retryable)
- Rollback Brief `spec.md` / `tasks.md` / `delivery.json` if revise launch fails
- `/api/status` includes `terminal: { busy, queueDepth, runnerHealthy }`; desk shows the line
- Client revise wait raised to ~3 minutes; structured error codes + keep Confirm revise unlocked on failure
- Stuck revising (busy Terminal, no task progress) resurfaces **Revise again**

## 0.15.0 — 2026-09-17

### Live desk L3 smoke

- `npm run test:live` — automated desk shell + `/api/validate` / `/api/validate/fix` with mock LLM
- Documented in `.duaer/memory/testing.md`, README EN/ZH; CI runs on push/PR to develop/main

## 0.14.0 — 2026-09-17

### Live desk layout

- Full-width desk (no 1440px shell cap); three columns: chat | requirements / confirm / dispatch / revise | task progress
- Confirm column wider than chat; requirements fully expanded (no inner scroll) with structured paragraphs/lists and click-to-edit
- Progress lives in its own far-right column (per-run timeline, not stacked inside the confirm column)

### Validate before confirm / revise send

- Confirm and revise-dispatch stay blocked until `/api/validate` passes for current card fields
- Failures surface issues; auto-fix remains available; agent launch prompts forbid Confirming-intent / multi-choice re-confirm loops

### Hide preview/revise until delivery accepted

- While tasks are still in progress, do not show View product or Revise again
- Preview and revise CTAs appear only after accept (or during an active revise round)

### Revise card stays below confirm card

- Top confirm card keeps original labels/fields/styles; never morphs into the revise card
- Revise card lives in the bottom revise panel (under preview) for easy viewing after dialogue

### Survive worktree handoff cleanup

- Status/preview read Brief from product `develop` when the request worktree was removed
- Revise recreates a new worktree from develop (copies Brief) instead of failing when the worktree is gone

### Detect CLI agents under LaunchAgent PATH

- Prepend `~/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin` to PATH when live starts
- `whichCmd` falls back to those directories so Cursor Agent / Claude Code are found under launchd

### Docs

- README (EN/ZH) live-desk flow updated for fullscreen, three columns, validate-before-send, and structured confirm

## 0.13.0 — 2026-09-16

### Revise UX: brief visible, preview, Terminal reuse

- Expandable **Original brief** while revising so the confirm card is not buried
- **Revise again** is a compact CTA beside preview (only when accepted), not a permanent primary button
- Preview stays available during revise (keeps `delivery.preview` / artifact)
- Same worktree reuses one Terminal runner; follow-up tasks enqueue instead of opening new windows

### Init Duaer in the chosen product directory

- Live browse / `repo add` / dispatch use the **exact** folder the user picked (no silent switch to a single child git repo)
- Missing Duaer → run `duaer init --here` in that folder and again inside the new worktree
- Agent prompt: work only in the dispatched worktree; do not hunt other repos for Duaer

### Revise card stays visible after dispatch

- After revise confirm, right panel keeps a locked **revise card** with this round's confirmed fields
- Chat busy hint is dialogue-in-progress; only revise POST shows dispatching
- **Revise again** starts a new dialogue round

### CLI update check + self-update

- Shared npm latest check (24h cache under `~/.duaer/`; `DUAER_NO_UPDATE_CHECK=1` skips)
- `duaer self-update` runs `npm i -g duaer-spec@latest` (prompt-only by default — no silent install)
- Common commands and live desk print a one-line upgrade hint when outdated
- Live `/api/health` exposes `update.*`; UI shows a short notice
- Docs: global CLI vs product-repo `npx duaer-spec update`

### Fix stuck revise UI

- Entering revise auto-starts left-chat questions; remove fake loading label
- Revise panel shows a **Dispatch again** CTA when the revise card is ready

### Start command prefix `Duaer`

- Live desk start command / agent prompt prefix is `Duaer` (legacy `Agent` rewritten)

### Auto-fix on accept failure

- When confirm auto-accept fails, the bot message offers an **Auto-fix** action
- `POST /api/confirm/fix` revises the card from issues and re-runs accept

### Live revise via dialogue + session continue

- After preview: continue improving via left chat — multi-turn clarify why / what to change; revise card confirm, then dispatch
- Revise Terminal launch uses `agent --continue` / `claude --continue` so the prior CLI session keeps going
- One-shot freeform revise textarea removed

### Live revise after preview

- After delivery accepted, continue improving captures user feedback
- `POST /api/revise` restates feedback, appends Revision to the product Brief/tasks, reopens `delivery.json`, relaunches the CLI agent on the same worktree
- Status poll resumes until the next accept

### Deploy via GitHub CLI

- When a product job needs hosting / a public URL, default to `gh` + GitHub Actions (Pages template: `.duaer/templates/deploy-github-pages.yml`)
- Live dispatch detects deploy intent and adds task + agent prompt rules
- Docs: `docs/agent/deploy-github.md`; AGENTS immutable rule

### Docs language purity

- English docs must not contain Chinese (CJK); Chinese docs may include English terms
- Scrubbed CJK from `README.md`, `CHANGELOG.md`, and English agent catalog notes

## 0.12.0 — 2026-09-16

### Live desk → product dispatch (closed loop)

- Confirm + auto-accept, then pick a product repo (browse / scan / recent) and create `.worktree/feat-*` with Brief under that worktree’s `.duaer/specs/`
- Non-git folders: auto `git init -b develop`; repos without develop/main/master: auto-create local `develop`
- Launchers are **CLI only**: Cursor Agent and Claude Code — open Terminal and run `agent` / `cursor agent` or `claude` with the start command (prefix `Duaer`)
- Missing Cursor CLI shows install: `curl https://cursor.com/install -fsS | bash`
- Progress: poll product Brief `tasks.md` checkboxes; optional agent-launch.log tail
- On `delivery.json` accepted: show **View product** from `preview.url` (or auto-detect `index.html`); serve worktree files at `/api/artifact/<jobId>/…`
- Dispatch does not block the UI on Terminal open (async); 60s client timeout

### Docs

- README / README.zh-CN: live desk flow updated for CLI launch, progress, and preview link

## 0.11.0 — 2026-09-16

### Live browse remember

- Fix Browse…: persist selection into recent list immediately; normalize paths; accept `master`

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

- Restyle Live Dev to Probe visual language (steel plate, Outfit + Chivo Mono, register/lock accents)

### Live model presets

- Setup UI / CLI presets: **DeepSeek** (`https://api.deepseek.com` + `deepseek-flash`), OpenAI, custom
- `duaer live config --provider deepseek --api-key …`
- DeepSeek chat calls disable thinking mode for reliable JSON replies

## 0.10.0 — 2026-09-15

### Live Dev Web

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

### Docs: update path in installed guides

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
