<!-- duaer-spec agent ops (develop+main, feat/fix, .worktree, push opt-in) -->

# Agent development workflow

Part of **duaer-spec**. Authoritative over Duaer when they conflict.

## Required branches

| Branch | Role |
|---|---|
| `main` | Production / online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Feature → merge to `develop` |
| `fix/<name>` | Bugfix → `develop` (hotfix: from `main` → `main` then `develop`) |

Detail: `docs/agent/branching-and-release.md`.

## Isolated development (mandatory worktree)

Before editing files for a new request:

1. Update local **`develop`** (hotfix: **`main`**)
2. Create `feat/<name>` or `fix/<name>`
3. Create worktree at **`.worktree/feat-<name>`** or **`.worktree/fix-<name>`**
   (slash → hyphen). Do **not** reuse the Brief folder name
   (`.duaer/specs/<nnn-slug>/`) as the worktree id.
4. Develop only inside that worktree
5. Never develop on `main` / `develop` or in the primary checkout
6. Never reuse another agent's branch/worktree
7. Never commit `.worktree/`

```bash
mkdir -p .worktree
git worktree add .worktree/feat-login -b feat/login develop
cd .worktree/feat-login
# Brief lives inside the checkout, e.g. .duaer/specs/002-login/
```

## Immutable habits

- Spec-sync for behavior changes; ADR when architecture/security/contracts change
- One logical change per commit; leave the worktree clean
- Risk-based verification per `.duaer/memory/testing.md` before accept / merge
- User/protocol-visible changes update E2E scenario docs **and** run required L3 subsets
- Merge into **`develop`** when done (hotfix: **`main`**, then back-merge **`develop`**)
- **Handoff (mandatory):** stop worktree-bound processes → remove `.worktree/<id>` →
  restart from primary checkout on `develop` (`duaer handoff [--run]`, `.duaer/handoff.json`)
- Push only when the user explicitly asks (a deploy/hosting ask authorizes
  the `gh` + push needed for that publish — see `docs/agent/deploy-github.md`)
- Promote **`develop` → `main`** only when the user asks to go online
- English docs: no Chinese (CJK); Chinese docs may include English terms

## GitHub issue / PR intake

Issue: verify before work; comment in issue language; close when conclusive.  
PR: judge principle; merge sound PRs; no silent reimplementation.  
Neither authorizes push by itself.

## Commits

```text
type(scope): description
```

Types: `feat fix docs test chore refactor perf build ci` — English, imperative.
