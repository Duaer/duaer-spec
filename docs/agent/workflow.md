# AI-Assisted Development Workflow

> Scope: **duaer-spec** agent ops (adoptable by other repositories)  
> Status: Accepted  
> Precedence: this document and root `AGENTS.md` win over Duaer / examples  
> Cross-references: [baseline](../baseline.md) · [e2e-test-plan](e2e-test-plan.md) · [change-checklist](change-checklist.md) · [ADR index](../adr/README.md) · [ADOPT](../../ADOPT.md)

---

## 1. Core Immutable Rules

R1–R4 restate the numbered Immutable Rules in `AGENTS.md` (R4 covers merge-back
and worktree clean-up). R5 and R6 restate GitHub issue and pull request
handling. They cannot be relaxed without explicit human override.

### R1 — Spec-first / Spec-sync

> **No behavior change without updating the corresponding spec.**

- Every change that alters observable behavior must update the relevant
  specification (project `docs/spec/`, Duaer feature specs, or
  `docs/agent/` when changing duaer-spec itself).
- Architectural boundary changes also require an ADR under `docs/adr/`.
- Pure refactors that preserve behavior and contracts do not require spec
  updates, but must still be committed (R2).

### R2 — Commit-per-change

> **Every completed logical change must be git committed.**

- One logical unit per commit. No large uncommitted piles at session end.
- Incomplete work: commit as `WIP:` draft or roll it back.

### R3 — Verification + E2E coverage

> **Agent-owned work must run risk-based verification from
> `.duaer/memory/testing.md`. User-visible or protocol-visible changes must
> also update E2E scenario docs.**

- Execute the levels required by the project's
  [testing contract](../../.duaer/memory/testing.md) (prefer subsets).
- Document scenarios in the project's E2E catalog (see
  [e2e-test-plan](e2e-test-plan.md)).
- Do **not** wait for the human to request ordinary L0–L3 checks.
- Opt-in only for suites marked expensive/remote/live in `testing.md`.
- Internal-only changes still need L0/L1 when those commands exist; they do
  not need E2E catalog updates.

### R4 — Request branch + worktree + merge gate

> **Every new request starts from `develop` (hotfix: `main`) in a dedicated
> `.worktree/<id>` on a `feat/*` or `fix/*` branch, and finishes after merge
> into that long-lived target. Going online is a separate `develop` → `main`
> promotion when the user asks to ship.**

- Before editing: preserve existing uncommitted work; fetch and fast-forward
  local **`develop`** when clean (hotfix: **`main`**); create a new request
  branch and worktree at **`.worktree/<request-id>`**. Worktrees are
  **mandatory**. Never stash or overwrite another agent's work merely to start.
- Name branches `feat/<short-description>` or `fix/<short-description>`.
- Do not implement in the primary checkout or on `main` / `develop`.
- Keep `.worktree/` gitignored — never commit request worktrees.
- After validation: merge into local **`develop`** (hotfix: **`main`**, then
  back-merge **`develop`**), stop worktree-bound services, remove the worktree,
  delete the short branch.
- Push only when the user explicitly requests remote publishing.
- Promote **`develop` → `main`** only when the user explicitly asks to go online.

Full matrix by issue type:
[branching-and-release](branching-and-release.md).

**duaer-spec itself** requires `main` + `develop` + `feat/*` + `fix/*`.
Example overlays under `examples/` do not change this.
### R5 — Verify linked GitHub issues before work, then reply and close

> **A linked GitHub issue is not a task until the reported problem is shown to
> exist. After a conclusive outcome, reply and close.**

Applies when the prompt includes a GitHub issue URL or unambiguous issue number
for this repository. Comment in the issue's language. An issue link does not
authorize push.

### R6 — Merge a linked pull request whose principle is sound, then follow up

> **Judge principle first. Merge that PR when sound; completeness is follow-up.**

Do not silently reimplement. Do not force-push the contributor branch. Draft
PRs stay unmerged unless the user explicitly asks. A PR link does not authorize
unrelated pushes.

---

## 2. Development Loop

1. **Intake** — If an issue or PR is linked, complete R5 / R6 first.
2. **Isolate** — Update `develop` (hotfix: `main`), create `feat|fix` + `.worktree/` (R4).
3. **Orient** — Read baseline, relevant specs, and Duaer memory when present.
4. **Specify (when using Duaer)** — Agent runs Brief → understand → work → accept autonomously.
5. **Implement** — Smallest coherent change; update specs alongside (R1).
6. **Verify** — Risk-based checks per `testing.md` (E2E subset when UI/UX
   touched; fork landing rules still in `AGENTS.md`).
7. **Commit** — One logical change per commit (R2).
8. **Merge & clean** — Merge to `develop` (hotfix: `main` + back-merge), stop
   worktree services, remove worktree (R4).
9. **Go online** — Only if asked: promote `develop` → `main`
   ([branching-and-release](branching-and-release.md)).
10. **Report** — Use the Final Report section in `AGENTS.md`.
---

## 3. Spec Update Guidance

| Change type | Spec sync | ADR |
|---|---|---|
| User-visible or protocol-visible behavior | Required | If architecture / contracts / security boundaries change |
| Internal refactor, same behavior | Not required | No |
| New public interface or data ownership | Required | Required |
| Docs-only / standards-only in this repo | Update `docs/` / `AGENTS.md` as needed | If a frozen decision changes |

Prefer Duaer feature directories for product feature work. Prefer `docs/agent/`
when changing duaer-spec's own agent-ops contract.

---

## 4. What Never to Commit

- Secrets, tokens, credentials, private keys
- Local databases, caches, build artifacts, `node_modules/`
- `.worktree/` (mandatory request worktrees)
- Machine-specific paths or environment files with secrets
- Unrelated changes from another request or agent

---

## 5. Duaer Relationship

- **Agent ops** (`AGENTS.md`, this file): isolation, commits, Issue/PR, merge.
- **Duaer** (repo root `.duaer/`, `DUADER.md`): what to build — specify →
  plan → tasks → implement → converge.

When they conflict, **agent ops win**. Install and conventions:
[DUADER.md](../../DUADER.md) · [ADOPT.md](../../ADOPT.md).
