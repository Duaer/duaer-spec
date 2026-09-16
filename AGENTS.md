# AGENTS.md

Mandatory rules for AI coding agents working in **duaer-spec**, and for any
repository that adopts this file as its agent-ops contract.

Treat agents as **digital employees**: they execute the job loop themselves.
Humans state intent; they do not operate Duaer phases. This file is workplace
policy for *how* agents may operate (isolation, commits, Issue/PR gates). Duaer
([`DUADER.md`](DUADER.md)) is how jobs are briefed and accepted. If Duaer
(`.duaer/`), `examples/`, or other overlays conflict with this file,
**follow this file**.

See also: [workflow](docs/agent/workflow.md) · [change checklist](docs/agent/change-checklist.md) · [ADOPT](ADOPT.md)

## Language

Use English for code, identifiers, comments, commits, specifications, and
documentation unless the adopting project explicitly overrides.

**Documentation language purity:** English doc files must not contain Chinese
(CJK) characters. Chinese docs may include English terms and tool names.

Follow the project's [baseline](docs/baseline.md) (or its local equivalent).

## Autonomous job loop (all hosts)

For product work (new behavior, fixes, refactors), **you** run Brief →
**understand** → work → accept. Do **not** ask the human to type slash
commands, phase names, or CLI flags.

1. Isolate: `feat|fix/<name>` + `.worktree/feat-<name>/` (or `fix-…`); never
   reuse the Brief folder name as the worktree id.
2. Follow the `duaer-do` skill under the host skill root (when the host has skills):
   - Codex / shared: `.agents/skills/duaer-do/SKILL.md`
   - Cursor: `.cursor/skills/duaer-do/SKILL.md`
   - Claude Code: `.claude/skills/duaer-do/SKILL.md`
   - Copilot / Windsurf / Cline / Continue / Gemini / Aider: follow this section
     and the host adapter files installed by `duaer init`
3. Briefs live in `.duaer/specs/<nnn-slug>/`. Method notes: [`DUADER.md`](DUADER.md).
4. **Understand before Work:** restate precise goal / scope / acceptance; if
   the ask is vague, confirm with the human before implementing. Do not jump
   from a casual sentence to code.
5. One handoff line; never claim done unless `delivery.json` is `accepted`.

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
   implement the smallest coherent fix, merge into local `develop` (or
   hotfix into `main` then back-merge `develop`), then comment
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

## Mandatory branch model

Repositories that adopt this agent-ops contract **must** use:

| Branch | Role |
|---|---|
| **`main`** | Production / officially online |
| **`develop`** | Day-to-day integration and debugging |
| **`feat/<name>`** | Feature work (from `develop` → merge to `develop`) |
| **`fix/<name>`** | Bug fixes (from `develop` → `develop`; hotfixes from `main` → `main` then back to `develop`) |

Do **not** develop on `main` or `develop`. Full flows (including go-live by
issue type): [branching-and-release](docs/agent/branching-and-release.md).

**duaer-spec itself** uses this model: integrate on **`develop`**, promote to
**`main`** only when shipping.

## Mandatory Isolated Development

Every request must use its own dedicated branch and worktree.

A linked GitHub pull request is reviewed and, when the principle is sound,
merged before any replacement implementation worktree is created (R6).
Landing-blocker commits, if needed, go on top of the author's branch.

Before modifying any file, the agent must:

1. Update the primary checkout's local **`develop`** (or **`main`** for a
   production hotfix)
2. Create a unique branch from that base (`feat/…` or `fix/…`)
3. Create a dedicated worktree **under the project** at `.worktree/<request-id>`
4. Enter that worktree
5. Only then begin development

Worktrees live in **`.worktree/`** at the repository root. That directory is
**mandatory**, not optional, and **must never be committed** (see `.gitignore`).

Example (normal feature):

```bash
git switch develop
git pull --ff-only
mkdir -p .worktree
git worktree add .worktree/feat-login -b feat/login develop
cd .worktree/feat-login
```

**Two different folders — do not give them the same name:**

| Layer | Path | Role |
|---|---|---|
| Worktree | `.worktree/feat-<name>/` | Full git checkout for isolation |
| Brief | `.duaer/specs/<nnn-slug>/` | Job Spec / tasks / delivery stamp |

A worktree is a **complete** repo copy, so Briefs live *inside* it:

```text
.worktree/feat-login/.duaer/specs/002-login/spec.md
```

That is expected. What is **wrong** is reusing the Brief folder name as the
worktree id (e.g. `.worktree/002-login/.../specs/002-login/`) — it looks like
double nesting and confuses humans. Always:

* Branch: `feat/<name>` or `fix/<name>`
* Worktree: `.worktree/feat-<name>` or `.worktree/fix-<name>` (slash → hyphen)
* Brief: `.duaer/specs/<nnn-slug>/` (numbered catalog; may differ from `<name>`)

Branch and worktree names must be unique and clearly associated with the request.
Do **not** place request worktrees outside the repo (for example `../worktrees/`)
unless the project baseline explicitly overrides this and still keeps them
untracked.
## Multi-Agent Isolation

* Each agent must use its own branch and worktree
* Never develop directly in the primary checkout
* Never develop directly on `main` or `develop`
* Never reuse another agent's branch or worktree
* Never modify files inside another request's worktree
* Never switch another agent's branch
* Never delete another agent's branch or worktree
* Never include unrelated changes from another request
* Do not commit local environment files, caches, databases, secrets, or `.worktree/`

The primary checkout is reserved for synchronizing and merging **`develop`**
(and **`main`** on promote / hotfix). Shared toolchains and caches may be
reused when that cannot modify tracked files or interfere with another worktree.

## Immutable Rules

### 1. Keep Specs Synchronized

Every behavior change must update the relevant project specification
(commonly under `docs/spec/`, Duaer feature specs, or this repo's
`docs/agent/` when changing duaer-spec itself).

Add an ADR under `docs/adr/` when changing architecture, public interfaces,
data ownership, security boundaries, or frozen decisions.

### 2. Commit Every Logical Change

* One logical change per commit
* No large uncommitted diffs
* No unrelated cleanup
* Leave the request worktree clean

### 3. Verify by risk (tests + E2E docs)

Agent-owned development **must** run verification required by the project's
[`.duaer/memory/testing.md`](.duaer/memory/testing.md) risk table before
accepting a job or merging into local **`develop`**. Prefer targeted subsets
over full suites. Record commands and results in the handoff / `delivery.json`
`verification` field when used.

Every user-visible or protocol-visible behavior change must also add or update
a scenario in the project's E2E catalog (template:
[e2e-test-plan](docs/agent/e2e-test-plan.md)).

**Do not** skip required L0–L3 levels waiting for the human to say “run tests”.
Opt-in only for suites the project's `testing.md` marks as expensive / remote /
live (full-repo E2E, paid live LLM, manually triggered remote jobs, etc.).

**Exception (forked third-party PR heads):** when landing a contributor PR under
R6, run the project's required local suites before merge when the project has
them; record results in the pull request comment. Completeness gaps on the
contributor's branch may still be follow-up *after* a principle-sound merge,
except when a failing required suite would break `main`.

### 4. Deploy via GitHub CLI when hosting is required

If the product job needs a public URL or hosting, default to **GitHub Actions
automated deploy driven by `gh`** (see
[deploy-github.md](docs/agent/deploy-github.md)). Do not default to third-party
host CLIs unless the adopting project already standardizes on them. A deploy
ask authorizes the push / `gh` steps required for that publish (still no
force-push or unrelated branches).

### 5. Merge Back into Local `develop` (or hotfix `main`)

After normal development:

1. Complete risk-based verification (see §3 / `testing.md`)
2. Review the complete diff
3. Commit all logical changes
4. Update the request branch with the latest local **`develop`**
5. Resolve conflicts inside the request worktree
6. Return to the primary checkout
7. Merge the request branch into local **`develop`**
8. Verify the expected commits are present
9. Stop any server/process started from the request worktree; if the user still
   needs a local service, start it from the primary checkout on **`develop`**
10. Remove the request worktree
11. Delete the merged request branch
12. Push only when the user explicitly requested remote publishing for the
    current request
13. Promote **`develop` → `main`** only when the user explicitly asks to ship /
    go online (see [branching-and-release](docs/agent/branching-and-release.md))

**Production hotfix:** base and merge into **`main`**, then merge the fix into
**`develop`** so integration does not regress. Then clean up the worktree.

If another agent has updated `develop`, refresh the request branch before
merging (`git fetch` then `git rebase develop`, or merge if project policy
requires it).

Do not overwrite, reset, or discard changes already merged by another agent.

Remote publishing is opt-in. Never infer a push from ordinary development,
commit, merge, or completion requests. Never force-push unless the user
explicitly requests that exact operation.

### 6. Clean Up the Request Worktree

Once the request branch is merged into local **`develop`** (or **`main`** for a
hotfix), remove its worktree and delete the merged branch. Never leave a merged
worktree on disk.

```bash
git worktree remove .worktree/<request-id>
git branch -d feat|fix/<request-id>
git worktree prune
```

* Remove only after verifying merge commits are present on the target long-lived branch
* The worktree must be clean first
* Use `git branch -d` (not `-D`)
* Delete only your own worktree and branch
* Never commit `.worktree/` (ignored)
* Stop worktree-bound services before remove; then restart from the primary
  checkout on **`develop`** via `.duaer/handoff.json` / `duaer handoff [--run]`
  (mandatory handoff — see [branching-and-release](docs/agent/branching-and-release.md))

## Development Workflow

1. Update local **`develop`** (or **`main`** for hotfix)
2. Create a unique `feat/` or `fix/` branch
3. Create and enter `.worktree/<request-id>`
4. Read the baseline and relevant specs (and Duaer memory when present)
5. Identify affected specs, ADRs, E2E scenarios, and **`testing.md` levels**
6. Implement the smallest coherent change
7. Update documentation as required
8. Run risk-based verification (do not wait for the user to request ordinary tests)
9. Review the complete diff
10. Commit each logical change
11. Refresh against latest **`develop`** (or **`main`** for hotfix)
12. Merge into local **`develop`** (hotfix: **`main`**, then back-merge to **`develop`**)
13. Stop worktree services; remove worktree; delete short branch; **handoff**
    restart on `develop` (`duaer handoff [--run]` / `.duaer/handoff.json`)
14. Push only when explicitly requested
15. Promote **`develop` → `main`** only when the user explicitly asks to go online

Development must not begin before isolation steps 1–3 are complete.

For feature work that uses Duaer, the agent runs the job loop autonomously
(Brief → work → accept). Agent ops in this file still govern isolation, commits,
and merge. Branch/release detail:
[branching-and-release](docs/agent/branching-and-release.md).

## Commit Format

```text
type(scope): description
```

Allowed types: `feat fix docs test chore refactor perf build ci`

* English only
* Concise, imperative description
* One logical change per commit

## Completion Checklist

* [ ] Local **`develop`** was updated before development (or **`main`** for hotfix)
* [ ] A unique `feat/` or `fix/` branch was created
* [ ] A dedicated worktree was created under `.worktree/`
* [ ] All development occurred inside that worktree
* [ ] No other agent's branch or worktree was modified
* [ ] Relevant specs and E2E scenarios were updated
* [ ] Risk-based verification passed (or waived in feature docs per `testing.md`)
* [ ] No secrets, local data, `.worktree/`, or unrelated changes are included
* [ ] All logical changes were committed
* [ ] The branch was refreshed against the latest local **`develop`** (or hotfix base)
* [ ] Changes were merged into local **`develop`** (hotfix: **`main`** + back-merge **`develop`**)
* [ ] Worktree-bound services stopped; worktree removed; short branch deleted
* [ ] Remote publishing was skipped unless explicitly requested
* [ ] Promotion **`develop` → `main`** only if the user asked to go online
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
* Verification performed (commands/levels) or waiver reference
* Commit hashes and messages
* Merge target (`develop` / `main`) and result
* Worktree and branch cleanup result
* Service handoff (stopped in worktree / restarted on develop) if applicable
* Push target and result, or confirmation that nothing was pushed
* Whether `main` was promoted (or N/A)
* Linked GitHub issue / PR outcomes (or N/A)
