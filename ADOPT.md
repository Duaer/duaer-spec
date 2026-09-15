# Adopt duaer-spec

Install the **Duaer** methodology and agent-ops contract into another
repository. Keep product-specific policy in that repository.

## 1. Agent ops

```bash
cp AGENTS.md /path/to/project/
mkdir -p /path/to/project/.cursor/rules /path/to/project/docs/agent
cp .cursor/rules/agents-workflow.mdc /path/to/project/.cursor/rules/
cp .cursor/rules/ai-ui-copy.mdc /path/to/project/.cursor/rules/   # if the project has UI
cp docs/agent/workflow.md docs/agent/change-checklist.md docs/agent/e2e-test-plan.md \
  /path/to/project/docs/agent/
```

Then:

1. Set the product baseline (or link `docs/baseline.md`).
2. If the integration branch is not `main`, document the override in the baseline
   and adjust `AGENTS.md` examples.
3. Replace the E2E template with the product's real scenario catalog when one exists.

## 2. Duaer method

```bash
rsync -a .duaer/ /path/to/project/.duaer/
mkdir -p /path/to/project/.cursor/skills /path/to/project/.cursor/rules
rsync -a .cursor/skills/ /path/to/project/.cursor/skills/
cp .cursor/rules/duaer-spec.mdc /path/to/project/.cursor/rules/
cp DUADER.md /path/to/project/
```

Edit `.duaer/memory/constitution.md`, `project-context.md`, and `testing.md`
for that product.

## 3. Precedence

1. `AGENTS.md` / agent-ops — how agents operate  
2. `DUADER.md` / `.duaer/` — what to build  
3. Product overlays (do not copy `examples/` blindly)

## 4. Updates

Pin to a duaer-spec commit/tag, or periodically re-copy method files and
reconcile local overrides. Adopters are not auto-updated.

## 5. Do not copy

- `examples/` — samples only
- `SOURCE.md` — provenance for maintainers
