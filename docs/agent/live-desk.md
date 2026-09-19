# Duaer-spec FDE (live desk)

Field Development Environment for digital employees. Config and Briefs live under
`~/.duaer/live/`. Product work runs in isolated worktrees inside the chosen
product repo.

`duaer live` always starts the desk and opens the browser URL. A missing model
does not block startup — the Settings drawer opens so the operator can save
credentials, then chat.

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
`revising`) derived from the per-project session under
`~/.duaer/live/project-chats/`. When the session has anything to show, a short
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
| Kickoff & implementation | Brief/job id · task pool |
| Delivery | Delivery stamp · preview URL |
| Revisions | Each revise plan card (when present) |

API: `GET /api/projects/deliverables?path=…&lang=zh|en` (`format=json` for the
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
   review (Archify), then **kickoff**.

## Kickoff: task pool and workers

Kickoff owns Brief creation and dispatch:

- Builds a **dependency-aware task pool** (`dependsOn` edges).
- **Worker count** defaults to **1**. Optional **N** parallel workers on the
  **same** CLI (Cursor Agent or Claude Code — not mixed).
- Assignment: shared / cross-cutting tasks → worker 1; module-scoped tasks
  round-robin across workers.
- Progress **派工进度** shows **one lane per worker** when N>1 (per-worker
  tasks, running/queued/waiting-deps state, log tail). Single worker keeps the
  aggregate checklist.
- **Wave orchestration:** kickoff and status polls only release tasks whose
  `dependsOn` are already `[x]` in `tasks.md`. When a wave completes, the desk
  enqueues `--continue` on the owning lane with the next ready wave (no
  prompt-only hope). Assignment inherits the first dependency’s worker when
  possible so chained work stays on-lane.
- **Must finish:** prompts forbid ending with `Job not accepted yet`. Workers
  complete every assigned task and stamp `delivery.json` `accepted`. If the
  checklist is fully checked but delivery is still open, status poll nudges
  an idle lane once to stamp accept.
- **Execution graph:** kickoff shows a dependency SVG (architecture-panel look)
  colored by worker lane; employee count uses chips (1 serial / 2–4 parallel).
- Each worker has its own Terminal **queue lane** (`live-terminal`,
  `live-terminal/w2`, …) so parallel launches do not hit a single lock and exit.

## Delivery and revise

- Before `delivery.json` is `accepted`, workers update the product **README**
  to match what shipped.
- Revise: left-chat feedback → confirm revise card → architecture keep/redesign
  → relaunch on the same worktree (preempt leftover Agents, then enqueue).
  Progress tracks `R{n}-*` tasks for that revision.

## Verification

Touching live desk UI / protocol UX: L0 + **`npm run test:live`** (L3) per
[`.duaer/memory/testing.md`](../../.duaer/memory/testing.md). Catalog rows:
E2E-135…E2E-139 (modular / pool / README-on-delivery / chat Markdown / lanes),
E2E-145 (multi-worker progress lanes), E2E-146 (wave orchestration).

## Related

- Worker CLI vs desk LLM: [`worker-models.md`](worker-models.md)
- Branches / handoff: [`branching-and-release.md`](branching-and-release.md)
- Deploy hosts: [`deploy-targets.md`](deploy-targets.md)
