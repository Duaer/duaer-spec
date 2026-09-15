# Project Constitution (template)

Replace this file per project. Keep it short and enforceable.

Part of **duaer-spec**. If the host repo's `AGENTS.md` conflicts with this
constitution on isolation, commits, or Issue/PR gates, follow `AGENTS.md`; keep
Duaer for what to build.

## Core Principles

### I. Spec before code (NON-NEGOTIABLE)

Features, architecture changes, and hotfixes start with a Duaer feature
artifact before implementation. Default path:

`constitution` → `specify` → (optional `clarify`) → `plan` → (optional `checklist` / `analyze`) → `tasks` → `implement` → `converge`

Hotfix may shorten to: `specify` (mark hotfix) → `tasks` → `implement` → `converge`.
Never skip `specify` or `converge`.

### II. Read as-is before changing

Before any feature work, read:

1. This constitution
2. `.duaer/memory/project-context.md` (implementation truth)
3. Project product intent doc (if any)

### III. Smallest coherent change

Prefer the smallest change that satisfies the acceptance criteria in `spec.md`.
Do not expand scope without updating the spec and tasks.

### IV. Verify before done

Mark tasks complete only when the stated verification (tests, manual checks,
or converge) has been performed or explicitly waived in the feature docs.

Before merge, run `duaer check . --gate`. It fails on missing Spec, open
`- [ ]` tasks, or `delivery.json` that is not `status: "accepted"`. Converge
assessment is still agent-assisted; the gate makes the **handoff state**
machine-checkable.
