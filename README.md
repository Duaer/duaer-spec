<p align="center">
  <img src="docs/assets/duaer-spec-fde.svg" alt="Duaer-spec FDE" width="420" />
</p>

# duaer-spec

**Duaer** turns AI coding agents into **digital employees** that deliver
**satisfactory work**: you speak in normal language; the employee turns that
into a checkable Brief (goal / boundary / acceptance), implements only that
scope, and only claims done when acceptance is met.

The product pitch is **norms → satisfactory delivery** — not teaching humans
to operate Spec phases or slash commands.

You should **not** have to operate the workflow. After a one-time install, you
talk; the employee runs the process.

## One-time install

```bash
npx duaer-spec init --here
```

## Update

**Global CLI** (when `duaer` is installed globally):

```bash
npm i -g duaer-spec@latest   # works on any build (incl. older CLIs without self-update)
duaer self-update            # same as above once CLI ≥ 0.13
```

The CLI also prints a one-line hint when a newer npm release exists
(cache ≤24h; disable with `DUAER_NO_UPDATE_CHECK=1`).

**Product repo adapters** (after `init`):

```bash
npx duaer-spec update
```

Then use **Cursor**, **Claude Code**, **Codex**, **Copilot**, **Windsurf**, **Cline**, **Continue**, **Gemini**, or **Aider** — describe what you want.

Install writes host adapters for each (see [`ADOPT.md`](ADOPT.md)).

Chinese guide: [`README.zh-CN.md`](README.zh-CN.md)

## What the employee does (by itself)

1. Turns your ask into a Brief with **checkable acceptance**  
2. Implements within that Brief  
3. Verifies against acceptance (and project testing rules)  
4. Stamps accept only when the result should satisfy you — one handoff line  

Step skills and CLI checks exist for agents and power users — not as the
everyday human UI.

## Duaer-spec FDE (live desk)

Isolated from product repos. Config and Briefs live under `~/.duaer/live/`.
**Duaer-spec FDE** = Field Development Environment.

```bash
# Start anytime (opens the desk even if the model is not configured yet)
duaer live

# In the page Settings, or via CLI:
duaer live config --provider deepseek --api-key sk-...

# Remember a product repo for dispatch (optional; run inside that repo)
duaer live repo add
```

`duaer live` opens the browser to the desk URL (default `http://127.0.0.1:8787`).
If the model is missing, use **Settings** in the page. The desk is **full-width**
with three columns: **chat** | **modules / confirm / architecture / kickoff /
revise** | **task progress**. Detail:
[`docs/agent/live-desk.md`](docs/agent/live-desk.md).

**Verify (maintainers / agents):** after Duaer-spec FDE UI or validate-gate changes,
run `npm run test:live` (L3 smoke: desk shell markers + `/api/validate` with a
mock LLM — no paid API).

**Flow**

1. Open or create a **project**, then chat. The **Projects** drawer shows each
   project’s **delivery status**; open **Deliverables** when the session has
   content. Messy multi-topic talk is fine: the desk evolves **`modules[]`**
   (tabs). Chat bubbles render **Markdown** (`**bold**`, code, links).  
2. Per module: fill the confirm card (goal / out-of-scope / **checkable**
   acceptance / assumptions). Vague acceptance fails the gate; validate must
   pass before **Confirm**. Confirming a module **locks that card only** — it
   does **not** write a Brief or start workers yet. Jump between modules freely.  
3. When **all** modules you care about are confirmed → review / confirm
   **architecture** (Archify) → **kickoff**. Kickoff writes the Brief, builds a
   **dependency-aware task pool** (`dependsOn`), and assigns work. Default is
   **1** worker; optionally **N** parallel workers on the **same CLI**. Shared
   tasks go to worker 1; module tasks round-robin. Each worker gets its own
   **Terminal queue lane** (`live-terminal` / `live-terminal/w2`…).  
4. Pick a product repo (browse / scan / recent), or paste a path / project name.
   Missing paths are created; set **Projects parent folder** so short names
   resolve under it. Non-git folders get `git init -b develop`; missing
   develop/main/master creates local `develop`.  
5. Choose a **CLI** digital employee: **Cursor Agent** or **Claude Code**  
   - Cursor: `curl https://cursor.com/install -fsS | bash`  
   - Claude Code: `npm install -g @anthropic-ai/claude-code` (or `curl -fsSL https://claude.ai/install.sh | bash`)  
   - To run **DeepSeek or other models** for coding, point Claude Code at that API — see [`docs/agent/worker-models.md`](docs/agent/worker-models.md). The FDE setup page guide covers the same.  
6. Edit the start command (must begin with `Duaer`) → kickoff creates
   `.worktree/feat-*` and opens **Terminal** for each worker lane.  
7. Progress shows a **next-action** stage strip, then `tasks.md` polling.
   **View deliverables** (above progress) opens a generated HTML page of stage
   artifacts (requirements doc timeline, confirmation, architecture, task pool,
   delivery). On delivery, workers update the product **README** before
   `delivery.json` is `accepted`. Then open **Results** (**View result** when a
   page exists, otherwise **Open
   project folder**).  
8. If the result is not right: **Continue improving (left chat)** → confirm the
   revise card (same validate gate) → re-confirm architecture (keep or redesign)
   → relaunch on the same worktree (preempt leftover Agents before enqueue).
   Progress tracks this revision’s `R{n}-*` tasks. Failed launch rolls back the
   Brief Revision; status shows Terminal busy/queue per lane.  
9. If the job needs hosting / a public URL, pick a **planned host** on the desk
   (Cloudflare / Alibaba Cloud / AWS / GitHub Pages) so code matches that
   platform ([`docs/agent/deploy-targets.md`](docs/agent/deploy-targets.md)).
   Default when unspecified: **GitHub CLI (`gh`) + Actions**
   ([`docs/agent/deploy-github.md`](docs/agent/deploy-github.md))

Worktree id ≠ Brief folder name — use `.worktree/feat-<name>/`, Brief under `.duaer/specs/<nnn-slug>/` inside that worktree.

## Branches (mandatory)

| Branch | Role |
|---|---|
| `main` | Production / online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Features → `develop` |
| `fix/<name>` | Fixes → `develop` (hotfix via `main`) |

Go-live and flows by issue type:
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md).

**After merge:** `duaer handoff [--run]` restarts local services on `develop`
(configure commands in `.duaer/handoff.json`).

## Optional

```bash
npx duaer-spec init --here --method
```

Details: [`ADOPT.md`](ADOPT.md) · Method: [`DUADER.md`](DUADER.md) · Ops: [`AGENTS.md`](AGENTS.md)

When agent ops and method conflict, **agent ops win**.
