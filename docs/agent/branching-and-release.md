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

Optional types when the project already uses them: `docs/`, `chore/`, `refactor/`,
`test/`, `ci/` — still branch from `develop`, merge back to `develop` first.

---

## 2. Day-to-day development (feature or normal bug)

```text
update develop
  → git worktree add .worktree/<id> -b feat|fix/<name> develop
  → work only in that worktree (Duaer job loop as needed)
  → merge into local develop
  → stop any server started in the worktree
  → remove .worktree/<id>; delete feat|fix/<name>
  → (optional) start/restart services from the primary checkout on develop
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
# stop processes that used .worktree/feat-login
git worktree remove .worktree/feat-login
git branch -d feat/login
```

**After merge / before delete worktree:** if a local service was running from the
worktree, stop it; if the user still needs it, start it again from the primary
checkout on **`develop`** (merged tree). Do not expect the old worktree process
to survive directory removal.

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
  → deploy per project runbook (out of scope for duaer-spec itself)
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

## Related

- [workflow.md](workflow.md) — R4 and development loop  
- [change-checklist.md](change-checklist.md) — finish checklist  
- [baseline.md](../baseline.md) — frozen: `develop` + `main`  
- [ADOPT.md](../../ADOPT.md) — install into another repo  
