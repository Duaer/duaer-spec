# Project Constitution (template)

Replace this file per project. Keep it short and enforceable.

Part of **duaer-spec**. If the host repo's `AGENTS.md` conflicts with this
constitution on isolation, commits, or Issue/PR gates, follow `AGENTS.md`; keep
Duaer for what to build.

## Core Principles

### I. Spec before code (NON-NEGOTIABLE)

The **agent** starts a Brief before coding — the human does not operate phases.
Autonomous default: follow `duaer-do` (Brief → **understand** → tasks →
implement → converge). Never skip Spec, intent confirm when vague, or converge.
Never ask the human to run `/duaer-*` for normal work.

### II. Read as-is before changing

Before any feature work, read:

1. This constitution
2. `.duaer/memory/project-context.md` (implementation truth)
3. Project product intent doc (if any)

### III. Smallest coherent change

Prefer the smallest change that satisfies the acceptance criteria in `spec.md`.
Do not expand scope without updating the spec and tasks.

### IV. Verify before done

Mark tasks complete only when the verification required by
`.duaer/memory/testing.md` (and any Spec/task checks) has been **executed**,
or explicitly waived in the feature docs.

Do not stamp `delivery.json` `accepted` without verification evidence (or a
written waiver). Prefer automated subsets; use manual L4 only when automation
cannot cover the path.

**Job handoff (not a git lock):** the agent reports accept/open itself.
Default policy `coach` — do not claim "done" while the active job is unfinished.
Do not send the human to run `duaer status` for routine work.
