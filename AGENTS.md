# AGENTS.md

Mandatory rules for AI coding agents working in **duaer-spec**, and for any
repository that adopts this file as its agent-ops contract.

This file is authoritative for *how* agents operate. If Spec Kit (`.specify/`,
`SPECKIT.md`), `examples/`, or other overlays conflict with this file,
**follow this file**.

See also: [workflow](docs/agent/workflow.md) · [change checklist](docs/agent/change-checklist.md) · [ADOPT](ADOPT.md)

## Language

Use English for code, identifiers, comments, commits, specifications, and
documentation unless the adopting project explicitly overrides.

Follow the project's [baseline](docs/baseline.md) (or its local equivalent).

## GitHub Issue Handling

When the user provides a GitHub issue URL (or an unambiguous issue number for
this repository), treat it as an intake gate. Do not start implementation
until the reported problem has been independently verified.

1. Fetch the issue (title, body, labels, comments, and state).
2. Decide whether the claim is real in the current codebase:
   - Bug: reproduce it, or show concrete code/spec evidence that it exists.
   - Feature or improvement: confirm the requested behavior is actually missing
     or incomplete, and in scope.
3. If the problem does **not** exist (already fixed, invalid, or a
   misunderstanding): comment on the issue with the verification evidence, and
   close the issue when the conclusion is clear. If verification is
   inconclusive, comment with what was tried and leave the issue open.
4. If the problem **does** exist: follow the isolated development workflow,
   implement the smallest coherent fix, merge into local `main`, then comment
   on the issue and close it.
5. Write the issue comment in the issue's language (the language of the
   original title and body). Repository docs, code, and commits stay English
   unless the project overrides.
6. An issue link authorizes commenting on and closing **that** issue. It does
   not authorize a git push. Remote publishing remains opt-in.

Do not comment on or close unrelated issues. Do not reopen a closed issue
unless the user explicitly asks.

See [R5](docs/agent/workflow.md#r5--verify-linked-github-issues-before-work-then-reply-and-close).

## GitHub Pull Request Handling

When the user provides a GitHub pull request URL (or an unambiguous pull
request number for this repository), treat it as an intake gate. Review the
principle first. Do not rewrite the pull request as a replacement for the
contributor's work. Do not create a replacement request branch or worktree
until that decision is made. If merging, start follow-up only after the pull
request is in `main`.

1. Fetch the pull request (title, body, files, commits, comments, checks,
   draft state, base/head, and linked issues).
2. Decide whether the **principle** is sound in the current codebase:
   - The change addresses a real, in-scope problem.
   - The approach is compatible with the baseline, security boundaries, and
     architecture (or is a justified spec-backed amendment).
   - Judge the direction, not whether the pull request already satisfies
     spec-sync, tests, style, or other completeness rules.
3. If the principle is sound: merge **that** pull request first, preserving
   the contributor's commits. If the head branch lives in a fork (third-party
   contributor), run the project's relevant local automated suites against the
   head first when the project has them; a failing required suite is a landing
   blocker, not a follow-up. Completeness gaps (specs, tests, i18n, e2e docs,
   style, naming, commit-message nits) are follow-up work after merge, not
   merge blockers. Landing blockers that would break `main` may receive the
   smallest commits on top of the author's work so the pull request can land.
   Then follow the isolated development workflow for any follow-up.
4. If the principle is not sound, or a harm blocker exists (secrets, sandbox
   or privilege bypass, malicious or clearly destructive changes, out-of-scope
   reversal of a frozen decision): do not merge. Comment with the evidence.
   Do not silently reimplement the same idea as if the pull request never
   existed.
5. Do not merge a draft pull request the author has not marked ready, unless
   the user explicitly asks to merge the draft.
6. Write the pull request comment in the pull request's language. Repository
   docs, code, and commits stay English unless the project overrides.
7. A pull request link authorizes reviewing, commenting on, and merging
   **that** pull request. It does not authorize a force-push of the
   contributor's branch or publishing unrelated branches. Follow-up remote
   publishing remains opt-in.

Do not comment on or merge unrelated pull requests.

See [R6](docs/agent/workflow.md#r6--merge-a-linked-pull-request-whose-principle-is-sound-then-follow-up).

## AI-Generated Page Content

AI-generated pages must not contain redundant explanatory text. Keep visible
copy limited to the information and actions users need to complete the task:

* Do not add filler introductions, repeated summaries, implementation notes,
  or prose that merely explains an obvious control or layout.
* Prefer concise labels, headings, helper text, and empty states.
* Put rationale and implementation detail in documentation or code comments,
  not in the page UI, unless the user explicitly requests explanatory content.

## Mandatory Isolated Development

Every request must use its own dedicated branch and worktree.

A linked GitHub pull request is reviewed and, when the principle is sound,
merged before any replacement implementation worktree is created (R6).
Landing-blocker commits, if needed, go on top of the author's branch.

Before modifying any file, the agent must:

1. Update the primary checkout's local `main`
2. Create a unique branch from the updated `main`
3. Create a dedicated worktree for that branch
4. Enter the new worktree
5. Only then begin development

Example:

```bash
git switch main
git pull --ff-only
git worktree add ../worktrees/<request-id> -b <type>/<request-id> main
cd ../worktrees/<request-id>
```

Branch and worktree names must be unique and clearly associated with the request.

**This repository's default integration branch is `main`.** Adopting projects
may substitute another long-lived branch (for example `develop`); document that
override in the project baseline. Do not inherit git policy from `examples/`.

## Multi-Agent Isolation

* Each agent must use its own branch and worktree
* Never develop directly in the primary checkout
* Never develop directly on `main` (or the project's integration branch)
* Never reuse another agent's branch or worktree
* Never modify files inside another request's worktree
* Never switch another agent's branch
* Never delete another agent's branch or worktree
* Never include unrelated changes from another request
* Do not commit local environment files, caches, databases, or secrets

The primary checkout is reserved for synchronizing and merging the integration
branch. Shared toolchains and caches may be reused when that cannot modify
tracked files or interfere with another worktree.

## Immutable Rules

### 1. Keep Specs Synchronized

Every behavior change must update the relevant project specification
(commonly under `docs/spec/`, Spec Kit feature specs, or this repo's
`docs/agent/` when changing duaer-spec itself).

Add an ADR under `docs/adr/` when changing architecture, public interfaces,
data ownership, security boundaries, or frozen decisions.

### 2. Commit Every Logical Change

* One logical change per commit
* No large uncommitted diffs
* No unrelated cleanup
* Leave the request worktree clean

### 3. Keep E2E Documentation Synchronized

Every user-visible or protocol-visible behavior change must add or update a
scenario in the project's E2E catalog (template:
[e2e-test-plan](docs/agent/e2e-test-plan.md)).

Do not run local E2E commands or manually trigger remote E2E jobs unless
explicitly requested by the user, **except** for forked third-party pull
request heads when the project requires local suites before merge. Record the
result in the pull request comment.

### 4. Merge Back into Local `main`

After development:

1. Complete targeted validation
2. Review the complete diff
3. Commit all logical changes
4. Update the request branch with the latest local `main`
5. Resolve conflicts inside the request worktree
6. Return to the primary checkout
7. Merge the request branch into local `main`
8. Verify the expected commits are present
9. Remove the request worktree
10. Delete the merged request branch
11. Push only when the user explicitly requested remote publishing for the
    current request

If another agent has updated `main`, refresh the request branch before merging
(`git fetch` then `git rebase main`, or merge if project policy requires it).

Do not overwrite, reset, or discard changes already merged by another agent.

Remote publishing is opt-in. Never infer a push from ordinary development,
commit, merge, or completion requests. Never force-push unless the user
explicitly requests that exact operation.

### 5. Clean Up the Request Worktree

Once the request branch is merged into local `main`, remove its worktree and
delete the merged branch. Never leave a merged worktree on disk.

```bash
git worktree remove ../worktrees/<request-id>
git branch -d <type>/<request-id>
git worktree prune
```

* Remove only after verifying merge commits are present in local `main`
* The worktree must be clean first
* Use `git branch -d` (not `-D`)
* Delete only your own worktree and branch

## Development Workflow

1. Update local `main`
2. Create a unique request branch
3. Create and enter a dedicated worktree
4. Read the baseline and relevant specs (and Spec Kit memory when present)
5. Identify affected specs, ADRs, E2E scenarios, and validation
6. Implement the smallest coherent change
7. Update documentation as required
8. Run targeted, risk-based checks
9. Review the complete diff
10. Commit each logical change
11. Refresh the branch against the latest local `main`
12. Merge into local `main`
13. Remove the request worktree and delete the merged branch
14. Push only when explicitly requested for the current request

Development must not begin before steps 1–3 are complete.

For feature work that uses Spec Kit, prefer
`specify → plan → tasks → implement → converge` (or the hotfix short path).
Agent ops in this file still govern isolation, commits, and merge.

## Commit Format

```text
type(scope): description
```

Allowed types: `feat fix docs test chore refactor perf build ci`

* English only
* Concise, imperative description
* One logical change per commit

## Completion Checklist

* [ ] Local `main` was updated before development
* [ ] A unique request branch was created
* [ ] A dedicated worktree was created
* [ ] All development occurred inside that worktree
* [ ] No other agent's branch or worktree was modified
* [ ] Relevant specs and E2E scenarios were updated
* [ ] Targeted validation passed or was documented as unnecessary
* [ ] No secrets, local data, or unrelated changes are included
* [ ] All logical changes were committed
* [ ] The branch was refreshed against the latest local `main`
* [ ] Changes were merged into local `main`
* [ ] The request worktree was removed after the merge
* [ ] The merged request branch was deleted
* [ ] Remote publishing was skipped unless explicitly requested
* [ ] If pushed, the remote, branch, commit set, and Git identity were verified
* [ ] If a GitHub issue was linked: verified before work; commented in its
      language; closed when conclusive
* [ ] If a GitHub pull request was linked: principle reviewed; merged first
      when sound; follow-up after merge; contributor work not discarded

## Final Report

Report:

* Branch and worktree used
* What changed
* Documentation updated
* Validation performed or skipped
* Commit hashes and messages
* Merge result
* Worktree and branch cleanup result
* Push target and result, or confirmation that nothing was pushed
* Linked GitHub issue / PR outcomes (or N/A)
