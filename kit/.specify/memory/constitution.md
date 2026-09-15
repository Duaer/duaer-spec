# Project Constitution (template)

Replace this file per project. Keep it short and enforceable.

Part of **duaer-spec**. If agent-ops rules in the host repo's `AGENTS.md`
(MyDesk-style) conflict with this constitution, follow `AGENTS.md` for
isolation, commits, and Issue/PR gates; keep Spec Kit for what to build.

## Core Principles

### I. Spec before code (NON-NEGOTIABLE)

Features, architecture changes, and hotfixes start with a Spec Kit feature
artifact before implementation. Default path:

`constitution` → `specify` → (optional `clarify`) → `plan` → (optional `checklist` / `analyze`) → `tasks` → `implement` → `converge`

Hotfix may shorten to: `specify` (mark hotfix) → `tasks` → `implement` → `converge`.
Never skip `specify` or `converge`.

### II. Read as-is before changing

Before any feature work, read:

1. This constitution
2. `.specify/memory/project-context.md` (implementation truth)
3. Project product intent doc (if any)

### III. Smallest coherent change

Prefer the smallest change that satisfies the acceptance criteria in `spec.md`.
Do not expand scope without updating the spec and tasks.

### IV. Verify before done

Mark tasks complete only when the stated verification (tests, manual checks,
or converge) has been performed or explicitly waived in the feature docs.
