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
duaer self-update
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

## Duaer FED (live desk)

Isolated from product repos. Config and Briefs live under `~/.duaer/live/`.
**Duaer FED** = Field Engineering Desk.

```bash
# DeepSeek (recommended)
duaer live config --provider deepseek --api-key sk-...

# Remember a product repo for dispatch (optional; run inside that repo)
duaer live repo add

duaer live
```

Open the printed URL (default `http://127.0.0.1:8787`). The desk is **full-width**
with three columns: **chat** | **requirements / confirm / dispatch / revise** |
**task progress**.

**Verify (maintainers / agents):** after Duaer FED UI or validate-gate changes,
run `npm run test:live` (L3 smoke: desk shell markers + `/api/validate` with a
mock LLM — no paid API).

**Flow**

1. Dialogue → fill the confirm card (structured goal / out-of-scope / **checkable**
   acceptance / assumptions). Vague acceptance fails the gate; auto-validate must
   pass before **Confirm** is enabled; auto-fix stays available on failure  
2. Pick a product repo (browse / scan / recent). Non-git folders get `git init -b develop`; missing develop/main/master creates local `develop`  
3. Choose a **CLI** digital employee: **Cursor Agent**, **Claude Code**, or **DeepSeek** (`npm install -g deepseek-tui`; Cursor: `curl https://cursor.com/install -fsS | bash`)  
4. Edit the start command (must begin with `Duaer`) → dispatch creates `.worktree/feat-*` and opens **Terminal** to run the CLI  
5. Watch progress in the right column (`tasks.md`); when `delivery.json` is `accepted`, open **View product** (`preview.url` or auto-detected `index.html`)  
6. If the result is not right: click **Continue improving (left chat)**, clarify why and what to change, confirm the revise card (same validate gate), then the desk relaunches on the same worktree (preempt leftover Agents before enqueueing revise). Progress tracks this revision’s `R{n}-*` tasks. Failed launch rolls back the Brief Revision and keeps **Confirm revise** available; status shows Terminal busy/queue.  
7. If the job needs hosting / a public URL, deploy with **GitHub CLI (`gh`) + Actions** (Pages template under `.duaer/templates/deploy-github-pages.yml`; see [`docs/agent/deploy-github.md`](docs/agent/deploy-github.md))

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
