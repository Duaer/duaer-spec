# Branching and release flows

> Part of **duaer-spec** agent ops. Precedence: [`AGENTS.md`](../../AGENTS.md) ·
> [workflow](workflow.md).  
> Language: English for branch names and docs.

This is **mandatory** for repositories that adopt duaer-spec agent ops.
Yes: every such repo **must** have a production main branch, a development
integration branch, feature branches, and bugfix branches.

---

## 1. Required branch model

| Branch | Role | Who merges here |
|---|---|---|
| **`main`** | Production / officially online | Only **promotion / release** (or emergency hotfix) |
| **`develop`** | Day-to-day integration and debugging | Finished `feat/*` and normal `fix/*` |
| **`feat/<name>`** | One feature / one request | → `develop` when ready to integrate |
| **`fix/<name>`** | One bugfix / one request | → `develop` (normal); or → `main` then `develop` (hotfix) |

### Rules

1. **Do not develop on `main` or `develop`.** Those are long-lived only.
2. **Every request** uses a short-lived `feat/` or `fix/` branch **and** a
   mandatory worktree at `.worktree/<request-id>` (never commit `.worktree/`).
3. **Default base for new work:** updated local **`develop`**.
4. **Going online** means promoting `develop` → `main` (or a release PR into
   `main`) when the user **explicitly** asks to ship / go online.
5. **Push** is always opt-in; never infer push from “merge” or “done”.

### Naming

```text
feat/<short-description>   # new capability / improvement
fix/<short-description>    # defect
```

Worktree directory = branch with `/` → `-`:

```text
branch feat/login  →  .worktree/feat-login
branch fix/timer   →  .worktree/fix-timer
```

Duaer Brief folders are separate: `.duaer/specs/<nnn-slug>/`. Because a worktree
is a full checkout, Specs appear as
`.worktree/feat-login/.duaer/specs/002-login/spec.md`. That nesting is normal.
Do **not** reuse `<nnn-slug>` as the worktree folder name.

Optional types when the project already uses them: `docs/`, `chore/`, `refactor/`,
`test/`, `ci/` — still branch from `develop`, merge back to `develop` first.

---

## 2. Day-to-day development (feature or normal bug)

```text
update develop
  → git worktree add .worktree/<id> -b feat|fix/<name> develop
  → work only in that worktree (Duaer job loop as needed)
  → merge into local develop
  → handoff (mandatory):
       stop processes bound to the worktree
       remove .worktree/<id>; delete feat|fix/<name>
       restart services from the primary checkout on develop
         (see .duaer/handoff.json / `duaer handoff [--run]`)
  → push develop only if the user asked
```

Example:

```bash
git switch develop
git pull --ff-only
mkdir -p .worktree
git worktree add .worktree/feat-login -b feat/login develop
cd .worktree/feat-login
# ... implement, commit ...
cd ../..   # primary checkout
git switch develop
git merge feat/login

# Handoff — do not skip
# 1) stop anything started under .worktree/feat-login
git worktree remove .worktree/feat-login
git branch -d feat/login
# 2) restart on develop (primary checkout)
duaer handoff --run
# or: npm run dev   # if listed in .duaer/handoff.json
```

### Worktree → develop service handoff (mandatory)

Deleting a worktree **removes that directory**. Any server started there will
break. Agents **must**:

1. Merge the request branch into **`develop`** (hotfix: **`main`**, then
   back-merge **`develop`**)
2. **Stop** processes whose cwd is under `.worktree/<id>/`
3. `git worktree remove .worktree/<id>` and delete the short branch
4. **Restart** from the **primary checkout** on the merged long-lived branch:
   - Read `.duaer/handoff.json` → `onWorktreeRemove.commands`
   - Run `duaer handoff` (prints the plan) or `duaer handoff --run` (starts
     configured commands in the background from the project root)
   - If `commands` is empty but the agent started a server in the worktree,
     restart the **same** command from the primary checkout on `develop`
   - Tell the user the new service is on the merged branch, not the old worktree

Configure per project by editing `.duaer/handoff.json`, for example:

```json
{
  "schemaVersion": 1,
  "onWorktreeRemove": {
    "restartFromPrimary": true,
    "commands": ["npm run dev"]
  }
}
```

---

## 3. Go-live / online (promote to production)

Use when the user explicitly asks to **ship**, **go online**, **release**, or
**promote to production**.

```text
develop is green / accepted for release
  → update local main and develop
  → merge develop → main (or open/merge release PR main ← develop)
  → tag / release notes if the project uses them
  → push main (and tags) only if the user asked to publish
  → if the product needs hosting, deploy with GitHub CLI + Actions
    (see [deploy-github.md](deploy-github.md)); do not default to third-party
    host CLIs unless the project already uses them
```

Never merge a random `feat/*` straight into `main` for a normal feature.
Features land on **`develop` first**, then ride a promotion to **`main`**.

---

## 4. Flows by problem type

### A. New feature / improvement

| Step | Action |
|---|---|
| Branch | `feat/<name>` from **`develop`** |
| Worktree | `.worktree/<id>` (required) |
| Integrate | Merge → **`develop`** |
| Online | Later promotion **`develop` → `main`** when user asks to ship |

### B. Normal bug (not blocking production)

| Step | Action |
|---|---|
| Branch | `fix/<name>` from **`develop`** |
| Worktree | `.worktree/<id>` |
| Integrate | Merge → **`develop`** |
| Online | Same as features: ship when promoting `develop` → `main` |

### C. Production hotfix (must go live immediately)

| Step | Action |
|---|---|
| Branch | `fix/<name>` from **`main`** |
| Worktree | `.worktree/<id>` |
| Online | Merge → **`main`** first (after validation) |
| Backport | Merge the same fix into **`develop`** (or merge `main` into `develop`) so develop does not regress |
| Cleanup | Remove worktree; delete `fix/<name>` |
| Push | Only if the user asked to publish |

### D. Docs / chore / CI-only

Same as **A**: from `develop`, merge to `develop`. Promote with the next
`develop` → `main` ship unless the user asks for an urgent docs-only release.

### E. Linked GitHub issue

Still: verify the claim (R5), then use **A/B/C** by issue type. Closing the
issue does not mean push or promote to `main`.

### F. Linked GitHub PR

Judge principle (R6). Merge that PR into the correct target (`develop` for
normal work, `main` only if it is already a production/hotfix PR). Completeness
follow-up stays on `develop` unless it is a landing blocker.

---

## 5. What agents must not do

- Develop or commit directly on `main` or `develop`
- Skip `.worktree/` isolation
- Merge feature work only to `main` and leave `develop` behind
- Push, tag, or deploy without an explicit user ask for that action
- Leave a merged worktree on disk
- Assume a server started inside a worktree still runs after `worktree remove`

---

## 6. Primary checkout role

The primary clone is for:

- updating and merging **`develop`** (and **`main`** on promote/hotfix)
- creating/removing `.worktree/<id>` entries

All implementation edits happen inside the request worktree.

---

## 7. Install and update (adopters)

```bash
npx duaer-spec init --here     # once
duaer self-update              # upgrade global CLI from npm
npx duaer-spec update          # later refresh product-repo adapters — no --force recipe
```

`duaer` prints a one-line hint when a newer npm release exists (≤24h cache;
`DUAER_NO_UPDATE_CHECK=1` disables). Live desk `/api/health` exposes
`update.outdated` / versions for a short UI notice.

Details: [`ADOPT.md`](../../ADOPT.md). Chinese summary: [`README.zh-CN.md`](../../README.zh-CN.md).

## Related

- [workflow.md](workflow.md) — R4 and development loop  
- [deploy-github.md](deploy-github.md) — product hosting via `gh` + Actions  
- [change-checklist.md](change-checklist.md) — finish checklist  
- [baseline.md](../baseline.md) — frozen: `develop` + `main`  
- [ADOPT.md](../../ADOPT.md) — install / update into another repo  
- [README.zh-CN.md](../../README.zh-CN.md) — Chinese install, update, branches  

