# Duaer-spec FDE (live desk)

Field Development Environment for digital employees. Durable state lives in
`~/.duaer/live/desk.sqlite` (config, repos, jobs, project sessions). That
directory is **per-machine only** — it is never part of the npm package; each
user starts with an empty live root. Product work runs in isolated worktrees
inside the chosen product repo.

`duaer live` starts the desk on **port 8787** (`http://127.0.0.1:8787`). A missing
model does not block startup — the Settings drawer opens so the operator can save
credentials, then chat.

**Agents:** do not start a second desk or use another port. Prefer LaunchAgent
`com.duaer.live8787`. Interactive `duaer live` may open the browser once;
`DUAER_LIVE_NO_BROWSER=1` (set on the LaunchAgent) skips auto-open on restart.

Also see root [`README.md`](../../README.md) (EN) / [`README.zh-CN.md`](../../README.zh-CN.md).

## Layout

Three columns:

| Column | Role |
|---|---|
| Chat | Project dialogue; Markdown bubbles; messy multi-topic talk |
| Center | Module tabs + confirm cards → architecture → kickoff / revise |
| Progress | Delivery cockpit (stages + next action) · **View deliverables** · `tasks.md` polling · result bar |

## Project portfolio

The **Projects** drawer lists remembered product folders. Each row shows a
**delivery status** chip (`drafting` / `confirming` / `building` / `delivered` /
`revising`) derived from the per-project session in
`~/.duaer/live/desk.sqlite` (legacy `project-chats/*.json`, `config.json`,
`repos.json`, and `jobs/*` import on first open after upgrade). When the session has anything to show, a short
**Deliverables** control opens the dossier without hunting through progress.

`GET /api/projects` includes `deliveryStatus`, `nextAction`, and
`hasDeliverables` on each project row.

## Delivery cockpit (Progress)

With an active project, Progress shows a stage strip (requirements →
architecture → kickoff → delivery → revise) and one **next action** line in
plain language. **View deliverables** stays the primary CTA above the strip.

## Stage deliverables page

Above task progress, **View deliverables** opens a new tab with a standalone
HTML page generated from the project session:

| Stage | Artifacts |
|---|---|
| Requirements | Requirements document (version timeline) · confirmation of modules |
| Architecture | Diagram link · confirmation note |
| Kickoff & implementation | Brief/job id · task pool · employee roles |

| Delivery | Delivery stamp · preview URL |
| Revisions | Each revise plan card (when present) |

API: `GET /api/projects/deliverables?path=…&lang=zh|en|ja` (`format=json` for the
model). A cache file is written under `~/.duaer/live/project-chats/*-deliverables.html`.
The HTML uses a **white client dossier** look (not the desk dark theme).
Each page includes a **Contents** nav, stage anchors, and labeled field rows
(goal / out of scope / acceptance / assumptions) for confirmation cards.
Long acceptance lines (`1)…；2)…`) become ordered lists; out-of-scope lists
become chips; the task pool renders as a checklist table; confirmation is a
registry linking into the requirements document (no duplicate full cards).

## Modular confirm (no early Brief)

1. Chat evolves **`modules[]`** (and `activeModuleId`).
2. Each module has its own confirm card (goal / out-of-scope / checkable
   acceptance / assumptions). Validate must pass before Confirm.
3. Confirm locks **that module only**. It does **not** call `writeBrief` and does
   **not** start Terminal workers.
4. When all relevant modules are confirmed, the desk unlocks architecture
   review (Archify). After **architecture confirm**, kickoff UI opens.

## Bug dispatch (defect path)

Choosing「我要修一个 bug」(or equivalent locale) sets session `deskKind=bug`.
The middle column shows a **修 bug** button in the same bottom CTA row as
**再改一版** (not a top kind switch). Before the first delivery it appears in
the bottom strip under results; after delivery it sits beside「再改一版」.

1. One **defect card** (symptom / out of scope / fixed-when / env). No multi-module
   growth from chat. **Project delivery facts** (preview URL, start scripts,
   local path/port hints) are injected into chat + `assumptions` automatically —
   do not re-ask the operator. Suspected cause defaults to「待复现定位」; online
   emergency defaults to **no** (fix from develop) unless the user says
   production/urgent.
2. Confirmed defects append to the same **project timeline** as 初版 / 再改一版
   (sorted by time in deliverables). They are later iterations, not a parallel track.
3. After confirm, **architecture is skipped by default** (operator may still
   design if contracts or security change).
4. Kickoff builds a short pool: reproduce → fix → acceptance atoms → regress →
   README → stamp.
5. Worktree branch is **`fix/<name>`** from `develop`. Optional **production
   hotfix** checkbox bases the worktree on **`main`** when that branch exists.
6. Feature path (`deskKind=feature`) is unchanged.

The chat column’s right edge has a **导航** control that jumps to: chat bottom ·
confirm card · result · progress.

See [ADR 003](../adr/003-bug-dispatch.md).

## Kickoff: task pool and workers

Kickoff owns Brief creation and dispatch. Order after architecture confirm:

1. **Decompose** atomic tasks (one per acceptance line + impl / verify /
   shared steps). Parallelizable tasks (same dependency wave) are marked.
2. **Recommend** digital-employee count (1–4) from parallel width; the operator
   may change it, then **confirm** to build the **派工图**.
3. Launch uses the confirmed pool and worker count.

Additional notes:

- Builds a **dependency-aware task pool** (`dependsOn` edges).
- **Employee directory** (top bar): lists specialized roles — **Implementer**,
  **Functional regression**, and **Deployer**.
  - **Functional regression** checks confirmed acceptance against the product
    `.duaer/memory/testing.md` risk table (prefer Playwright / `npm test` /
    `npm run test:live`, L0–L3); writes or runs tests and keeps evidence; does
    **not** change product scope; on failure leaves a reproducible note and does
    not stamp `accepted`.
  - Runtime remains Cursor Agent / Claude Code; kickoff tasks carry
  `role: implement | verify-l3 | deploy`. With workerCount ≥ 2, verify-l3 and
  deploy tasks go to the last lane.
- **Atomic + monitorable:** one checkbox task per independently verifiable
  acceptance line (plus impl / verify / deploy / shared steps). Agents must mark
  `- [x]` as each atom completes so the desk can poll progress and release waves.
- **Worker count** is recommended from parallel width (cap 4). Optional **N**
  parallel workers on the **same** CLI (Cursor Agent or Claude Code — not mixed).
- Assignment: shared / cross-cutting tasks → worker 1; module-scoped tasks
  round-robin across workers.
- Progress **派工进度** shows **one lane per worker** when N>1 (per-worker
  tasks, running/queued/waiting-deps state, log tail). Single worker keeps the
  aggregate checklist.
- **Wave orchestration:** kickoff and status polls only release tasks whose
  `dependsOn` are already `[x]` in `tasks.md`. When a wave completes, the desk
  enqueues `--continue` on the owning lane with the next ready wave (no
  prompt-only hope). If that lane is still busy and a job is already queued,
  the desk preempts the leftover CLI. A script that only `cat`s the prompt
  file still counts: the next wave is queued only after this one is checked.
  It does not preempt a session whose named wave is still open.
  If a released wave is still unchecked and the lane is idle (nothing running,
  nothing queued), the desk drops that fingerprint and enqueues it again.
  Assignment inherits the first dependency’s worker when
  possible so chained work stays on-lane.
- **Must finish:** prompts forbid ending with `Job not accepted yet`. Workers
  complete every assigned task and stamp `delivery.json` `accepted`. The desk
  then runs `.duaer/memory/verify.json` in the worktree. A non-zero exit, or a
  missing contract, reopens `accepted` and enqueues the failure on the
  regression lane. It does not nudge the employee to stamp accept. A
  `docs-only` waiver (no commands) is the only skip. The first command list is
  frozen so a later waiver cannot replace it.
- **Execution graph:** after worker-count confirm, the desk builds the task
  path with the **same Archify renderer and layered layout** as the system
  architecture diagram. **查看派工图** / **Dispatch center** open
  `/dispatch-center.html` (100px project rail + selected graph).
- Each worker has its own Terminal **queue lane** (`live-terminal`,
  `live-terminal/w2`, …) so parallel launches do not hit a single lock and exit.

## Delivery and revise

- Before `delivery.json` is `accepted`, workers update the product **README**
  to match what shipped.
- Revise: left-chat feedback → confirm revise card → architecture keep/redesign
  → decompose / recommend workers / confirm graph → relaunch on the same
  worktree (preempt leftover Agents, then enqueue).
  Progress tracks `R{n}-*` tasks for that revision.
- **After deploy** (and whenever the result bar is visible):「再改一版」and
  「修 bug」remain available. Deploy is not an end state; later iterations and
  defect feedback continue on the same project timeline.

## Verification

Touching live desk UI / protocol UX: L0 + **`npm run test:live`** (L3) per
[`.duaer/memory/testing.md`](../../.duaer/memory/testing.md). Catalog rows:
E2E-135…E2E-139 (modular / pool / README-on-delivery / chat Markdown / lanes),
E2E-145 (multi-worker progress lanes), E2E-146 (wave orchestration).

## Related

- Worker CLI vs desk LLM: [`worker-models.md`](worker-models.md)
- Branches / handoff: [`branching-and-release.md`](branching-and-release.md)
- Deploy hosts: [`deploy-targets.md`](deploy-targets.md)
