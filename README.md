# MyDesk Dev Standards

Reusable AI / agent development standards extracted from **MyDesk** (PI-Desktop), for use in other repositories.

## What is included

| File | Role |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Mandatory rules for AI coding agents |
| [`docs/spec/06-delivery/03-ai-development-workflow.md`](docs/spec/06-delivery/03-ai-development-workflow.md) | Immutable workflow rules R1–R6 |
| [`docs/spec/06-delivery/05-change-checklist.md`](docs/spec/06-delivery/05-change-checklist.md) | Pre-finish checklist |
| [`.cursor/rules/`](.cursor/rules/) | Cursor rule drop-ins (same ideas, shorter) |

Product-specific MyDesk docs (full baseline, ADRs, E2E catalog, release runbook) are **not** included. See [`SOURCE.md`](SOURCE.md).

## How to use in another project

### Option A — Copy into the project root

```bash
cp AGENTS.md /path/to/your-project/
mkdir -p /path/to/your-project/docs/spec/06-delivery
cp docs/spec/06-delivery/03-ai-development-workflow.md \
   docs/spec/06-delivery/05-change-checklist.md \
   /path/to/your-project/docs/spec/06-delivery/
```

Then replace the placeholders under `docs/spec/00-baseline.md` and `docs/adr/` with that project's real contracts.

### Option B — Cursor rules only

```bash
cp .cursor/rules/*.mdc /path/to/your-project/.cursor/rules/
# or into ~/.cursor/rules/ for all projects
```

### Option C — Git submodule / subtree

```bash
git submodule add https://github.com/fujiezee/mydesk-dev-standards.git docs/dev-standards
```

Point the project's `AGENTS.md` at the submodule paths, or symlink.

## Core ideas (short)

1. **Spec-first / spec-sync** — behavior changes update docs
2. **Commit per logical change** — no large uncommitted piles
3. **E2E docs stay in sync** for user/protocol-visible changes
4. **One request = one branch + one worktree**, merge back to local `main`, push only when asked
5. **GitHub issues** — verify before coding; comment and close when done
6. **GitHub PRs** — merge sound principles first; polish after merge

## Note vs personal git-branch-flow

MyDesk's `AGENTS.md` merges short-lived work into local **`main`**.

If a project instead uses `develop` / `feat/*` / `fix/*` (see your Cursor user rule `git-branch-flow`), keep that project's branch policy and treat these docs as the agent checklist + issue/PR intake pattern — adapt the merge target accordingly.
