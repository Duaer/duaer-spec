# duaer-spec

**Duaer** turns AI coding agents into **digital employees**: they take a normal
language ask, run Spec → work → accept themselves, and only claim a job done
when the handoff is clean.

You should **not** have to operate the workflow. After a one-time install, you
talk; the employee runs the process.

## One-time install

```bash
npx duaer-spec init --here
```

## Update

```bash
npx duaer-spec update
```

Then use **Cursor**, **Claude Code**, **Codex**, **Copilot**, **Windsurf**, **Cline**, **Continue**, **Gemini**, or **Aider** — describe what you want.

Install writes host adapters for each (see [`ADOPT.md`](ADOPT.md)).

Chinese guide: [`README.zh-CN.md`](README.zh-CN.md)

## What the employee does (by itself)

1. Writes a Brief (Spec) for the ask  
2. Implements within that Brief  
3. Checks the result and stamps accept / still-open  
4. Tells you in one line whether the job is ready for review  

Step skills and CLI checks exist for agents and power users — not as the
everyday human UI.

## Live Dev (web confirm desk)

Isolated from product repos. Config and Briefs live under `~/.duaer/live/`.

```bash
# DeepSeek (recommended)
duaer live config --provider deepseek --api-key sk-...

# Remember a product repo for dispatch (optional; run inside that repo)
duaer live repo add

duaer live
```

Open the printed URL (default `http://127.0.0.1:8787`).

**Flow**

1. Dialogue → fill confirm card → auto-accept  
2. Pick a product repo (browse / scan / recent). Non-git folders get `git init -b develop`; missing develop/main/master creates local `develop`  
3. Choose a **CLI** digital employee: **Cursor Agent** or **Claude Code** (install Cursor CLI if needed: `curl https://cursor.com/install -fsS | bash`)  
4. Edit the start command (must begin with `Duaer`) → dispatch creates `.worktree/feat-*` and opens **Terminal** to run the CLI  
5. Watch `tasks.md` progress on the desk; when `delivery.json` is `accepted`, open **View product** (`preview.url` or auto-detected `index.html`)
6. If the result is not right: click **Continue improving (left chat)**, clarify why and what to change in dialogue, confirm the revise card, then the desk relaunches with `agent --continue` / `claude --continue` on the same worktree
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
