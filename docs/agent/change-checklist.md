# Change Checklist

> Practical finish checklist for **duaer-spec** agent ops.  
> Cross-references: [workflow](workflow.md) · [e2e-test-plan](e2e-test-plan.md) · [ADR index](../adr/README.md) · [AGENTS.md](../../AGENTS.md)

---

## 0. GitHub Issue Intake

When the prompt includes a GitHub issue URL or unambiguous issue number for
this repository:

- [ ] Issue title, body, labels, comments, and state were fetched.
- [ ] The reported problem was independently verified.
- [ ] Implementation started only after the problem was confirmed to exist.
- [ ] If the problem does not exist: verification comment; close when clear,
  or leave open when inconclusive.
- [ ] After a confirmed fix was merged: resolution comment and close.
- [ ] Comment uses the issue's language.
- [ ] No unrelated issue was touched; push was not inferred from the link.

See [R5](workflow.md#r5--verify-linked-github-issues-before-work-then-reply-and-close).

---

## 0.1 GitHub Pull Request Intake

When the prompt includes a GitHub pull request URL or unambiguous PR number:

- [ ] PR metadata, files, commits, checks, draft state, and linked issues were
  fetched.
- [ ] The **principle** was judged independently.
- [ ] Completeness gaps were not treated as merge blockers.
- [ ] If sound: merged first, preserving commits; follow-up only after `main`.
- [ ] If unsound or harmful: not merged; evidence commented; not reimplemented.
- [ ] Draft not merged unless the user explicitly asked.
- [ ] Comment uses the PR's language; no force-push of the contributor branch.

See [R6](workflow.md#r6--merge-a-linked-pull-request-whose-principle-is-sound-then-follow-up).

---

## 1. Request Start

- [ ] Existing uncommitted work is identified and preserved.
- [ ] `origin/develop` fetched; local `develop` fast-forwarded when clean
  (hotfix: `main`).
- [ ] Dedicated `feat/` or `fix/` branch and worktree under
  **`.worktree/<request-id>`** (mandatory; never commit `.worktree/`).
- [ ] Shared toolchains/caches reused where safe; mutable state stays local.
- [ ] Current branch is not `main` or `develop` before implementation begins.

---

## 2. Impact Analysis

- [ ] What behavior changes?
- [ ] Which specs / Duaer features are affected? (list paths)
- [ ] Architectural boundary? (contracts, storage, security, public API)
- [ ] User-visible or protocol-visible?
- [ ] Smallest verification set per `.duaer/memory/testing.md` (or waiver)?

See [spec update guidance](workflow.md#3-spec-update-guidance).

---

## 3. Spec Sync

- [ ] Every affected spec is updated.
- [ ] Architectural boundary change → ADR under `docs/adr/`.
- [ ] Cross-references still correct (no stale links).

---

## 4. Verification / E2E

- [ ] User/protocol-visible change → scenario added or updated in the project's
  E2E catalog ([template](e2e-test-plan.md)).
- [ ] Unit/integration tests updated when risk requires them.
- [ ] Risk-based levels from [testing.md](../../.duaer/memory/testing.md)
  executed (prefer subsets), or waived in feature docs.
- [ ] Opt-in-only suites (full-repo E2E, live LLM, remote triggers) run only
  when `testing.md` or the user requires them (fork landing rules in
  `AGENTS.md` still apply).

---

## 5. Git Commit

- [ ] One logical unit (or split into focused commits).
- [ ] No secrets, tokens, or local data.
- [ ] No build artifacts or dependency trees in the diff.
- [ ] Message: `type(scope): description` (English, imperative).
- [ ] `git diff --stat` reviewed — nothing unexpected.

---

## 6. Merge / PR

- [ ] Active job handoff considered by the **agent** (do not require the human to run CLI for routine work).
- [ ] Branch refreshed against latest `develop` (hotfix: `main`).
- [ ] Merged into local `develop` (hotfix: `main`, then back-merge `develop`).
- [ ] Worktree services stopped; worktree removed; short branch deleted;
  **handoff** restart on `develop` (`duaer handoff` / `.duaer/handoff.json`).
- [ ] Only this request's logical changes included.
- [ ] Push performed only if the user explicitly asked for this request.
- [ ] `develop` → `main` promotion only if the user asked to go online.

---

## 6.1 Merge Cleanup

- [ ] Expected commits present in `main`.
- [ ] Request worktree clean.
- [ ] `git worktree remove <path>` succeeded without forcing.
- [ ] `git branch -d <branch>` succeeded (no `-D` on unmerged).
- [ ] `git worktree prune`; no stale entry for this request.
- [ ] No other agent's worktree or branch was removed.

---

## 7. Definition of Done

| # | Gate | Source |
|---|---|---|
| 1 | Branch + `.worktree/` from up-to-date `develop` (hotfix: `main`) | [R4](workflow.md#r4--request-branch--worktree--merge-gate) · [branching](branching-and-release.md) |
| 2 | Change implements the planned work | [Development loop](workflow.md#2-development-loop) |
| 3 | Impacted specs updated | [R1](workflow.md#r1--spec-first--spec-sync) |
| 4 | E2E docs updated or confirmed unnecessary | [R3](workflow.md#r3--verification--e2e-coverage) |
| 5 | Risk-based verification done or waived with reason | [R3](workflow.md#r3--verification--e2e-coverage) · `testing.md` |
| 5a | Active job handoff by the agent (coach/strict) | Delivery OS — not a git lock |
| 6 | Conventional commits | [R2](workflow.md#r2--commit-per-change) |
| 7 | No secrets, local data, or `.worktree/` | [§4](workflow.md#4-what-never-to-commit) |
| 8 | Merged to `develop` (hotfix: `main` + back-merge); worktree cleaned | [R4](workflow.md#r4--request-branch--worktree--merge-gate) |
| 8a | `develop` → `main` only if user asked to go online | [branching-and-release](branching-and-release.md) |
| 9 | Linked issue: verified, commented, closed when conclusive | [R5](workflow.md#r5--verify-linked-github-issues-before-work-then-reply-and-close) |
| 10 | Linked PR: principle reviewed; merged when sound; follow-up after | [R6](workflow.md#r6--merge-a-linked-pull-request-whose-principle-is-sound-then-follow-up) |

If any gate fails, the change is **not Done**.
