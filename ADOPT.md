# Adopt duaer-spec

duaer-spec is a **standalone** standards package. Copy what you need; keep
product policy in the target repository.

## 1. Agent ops (required for the isolation contract)

```bash
cp AGENTS.md /path/to/project/
mkdir -p /path/to/project/.cursor/rules /path/to/project/docs/agent
cp .cursor/rules/agents-workflow.mdc /path/to/project/.cursor/rules/
cp .cursor/rules/ai-ui-copy.mdc /path/to/project/.cursor/rules/   # if the project has UI
cp docs/agent/workflow.md docs/agent/change-checklist.md docs/agent/e2e-test-plan.md \
  /path/to/project/docs/agent/
```

Then:

1. Replace or link `docs/baseline.md` to the product's frozen decisions.
2. If the integration branch is not `main` (for example `develop`), state that
   override in the baseline and adjust `AGENTS.md` examples accordingly.
3. Point the E2E template at the product's real scenario catalog when one exists.

## 2. Spec Kit (recommended for feature work)

```bash
rsync -a kit/.specify/ /path/to/project/.specify/
rsync -a kit/.cursor/skills/ /path/to/project/.cursor/skills/
mkdir -p /path/to/project/.cursor/rules
cp kit/.cursor/rules/spec-kit.mdc /path/to/project/.cursor/rules/
cp kit/SPECKIT.md /path/to/project/
```

Edit `.specify/memory/constitution.md`, `project-context.md`, and `testing.md`
for that product.

## 3. Precedence

In the target repo:

1. Root `AGENTS.md` / agent-ops docs — how agents operate
2. Spec Kit / `SPECKIT.md` — what to build
3. Optional overlays under that product (do not copy `examples/` blindly)

## 4. Versioning

This repository tracks standards on `main`. When adopting, pin to a commit or
tag if you need a frozen snapshot; otherwise periodically pull updates and
reconcile overrides in the product baseline.

Upstream Spec Kit snapshots in `vendor/` are refreshed weekly (see
[docs/maintaining.md](docs/maintaining.md)). Re-copy `kit/` into product repos
when you intentionally want those updates — adopters are not auto-updated.

## 5. What not to copy

- `examples/` — product-specific samples only
- `vendor/` — upstream reference snapshot only
- `SOURCE.md` — provenance for maintainers of duaer-spec
