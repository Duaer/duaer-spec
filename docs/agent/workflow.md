# AI-Assisted Development Workflow

> Scope: **duaer-spec** agent ops (adoptable by other repositories)  
> Status: Accepted  
> Precedence: this document and root `AGENTS.md` win over Spec Kit / examples  
> Cross-references: [baseline](../baseline.md) · [e2e-test-plan](e2e-test-plan.md) · [change-checklist](change-checklist.md) · [ADR index](../adr/README.md) · [ADOPT](../../ADOPT.md)

---

## 1. Core Immutable Rules

R1–R4 restate the numbered Immutable Rules in `AGENTS.md` (R4 covers merge-back
and worktree clean-up). R5 and R6 restate GitHub issue and pull request
handling. They cannot be relaxed without explicit human override.

### R1 — Spec-first / Spec-sync

> **No behavior change without updating the corresponding spec.**

- Every change that alters observable behavior must update the relevant
  specification (project `docs/spec/`, Spec Kit feature specs, or
  `docs/agent/` when changing duaer-spec itself).
- Architectural boundary changes also require an ADR under `docs/adr/`.
- Pure refactors that preserve behavior and contracts do not require spec
  updates, but must still be committed (R2).

### R2 — Commit-per-change

> **Every completed logical change must be git committed.**

- One logical unit per commit. No large uncommitted piles at session end.
- Incomplete work: commit as `WIP:` draft or roll it back.

### R3 — E2E coverage doc

> **User-visible or protocol-visible changes must update E2E scenario docs.**

- Document scenarios in the project's E2E catalog (see
  [e2e-test-plan](e2e-test-plan.md)).
- Internal-only changes (logging format, private renames) do not require it.

### R4 — Request branch + worktree + merge gate

> **Every new request starts from `main` in a dedicated worktree on a dedicated
> branch and finishes only after it is merged into `main`.**

- Before editing: preserve existing uncommitted work; fetch and fast-forward
  local `main` when clean; create a new request branch and worktree from that
  commit. Never stash or overwrite another agent's work merely to start.
- Name branches `<type>/<short-description>` (for example `feat/adopt-docs`).
- Do not implement in the primary checkout or reuse another request's worktree.
- Reuse shared toolchains and caches where safe; keep mutable or
  concurrency-sensitive state worktree-local and ignored.
- After validation: merge into local `main` (or via PR/MR when required), then
  remove the request worktree and delete the merged branch immediately.
- Push only when the user explicitly requests remote publishing for this
  request.

Adopting projects may replace `main` with another integration branch; document
it in the project baseline. **duaer-spec itself uses `main`.** Example overlays
under `examples/` do not change this repo's default.

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
2. **Isolate** — Update `main`, create branch + worktree (R4).
3. **Orient** — Read baseline, relevant specs, and Spec Kit memory when present.
4. **Specify (when using Spec Kit)** — Feature / hotfix specs before coding.
5. **Implement** — Smallest coherent change; update specs alongside (R1).
6. **Verify** — Targeted checks; E2E runs only if the user asks (except fork
   landing rules in `AGENTS.md`).
7. **Commit** — One logical change per commit (R2).
8. **Merge & clean** — Refresh against `main`, merge, remove worktree (R4 / R5).
9. **Report** — Use the Final Report section in `AGENTS.md`.

---

## 3. Spec Update Guidance

| Change type | Spec sync | ADR |
|---|---|---|
| User-visible or protocol-visible behavior | Required | If architecture / contracts / security boundaries change |
| Internal refactor, same behavior | Not required | No |
| New public interface or data ownership | Required | Required |
| Docs-only / standards-only in this repo | Update `docs/` / `AGENTS.md` as needed | If a frozen decision changes |

Prefer Spec Kit feature directories for product feature work. Prefer `docs/agent/`
when changing duaer-spec's own agent-ops contract.

---

## 4. What Never to Commit

- Secrets, tokens, credentials, private keys
- Local databases, caches, build artifacts, `node_modules/`
- Machine-specific paths or environment files with secrets
- Unrelated changes from another request or agent

---

## 5. Spec Kit Relationship

- **Agent ops** (`AGENTS.md`, this file): isolation, commits, Issue/PR, merge.
- **Spec Kit** (repo root `.specify/`, `SPECKIT.md`): what to build — specify →
  plan → tasks → implement → converge.

When they conflict, **agent ops win**. Install and conventions:
[SPECKIT.md](../../SPECKIT.md) · [ADOPT.md](../../ADOPT.md).
