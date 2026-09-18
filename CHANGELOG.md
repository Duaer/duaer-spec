# Changelog

## Unreleased

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
