# Adopt duaer-spec

Install the **Duaer** methodology and agent-ops contract into another
repository.

## Recommended: CLI

From the target project (Node 18+):

```bash
npx github:fujiezee/duaer-spec duaer init --here
# or method / ops only:
npx github:fujiezee/duaer-spec duaer init --here --method
npx github:fujiezee/duaer-spec duaer init --here --ops
# integration branch other than main:
npx github:fujiezee/duaer-spec duaer init --here --branch develop
```

From a clone of this repo:

```bash
node bin/duaer.mjs init /path/to/project --all
node bin/duaer.mjs check /path/to/project
```

`--force` overwrites managed files.

Then:

1. Edit `.duaer/memory/constitution.md` and `project-context.md` for the product
2. Confirm `docs/baseline.md` (integration branch)
3. Use `/duaer-specify` → `/duaer-plan` → `/duaer-tasks` → `/duaer-implement` → `/duaer-converge`

## Manual copy (optional)

### Agent ops

```bash
cp AGENTS.md /path/to/project/
mkdir -p /path/to/project/.cursor/rules /path/to/project/docs/agent
cp .cursor/rules/agents-workflow.mdc /path/to/project/.cursor/rules/
cp .cursor/rules/ai-ui-copy.mdc /path/to/project/.cursor/rules/
cp docs/agent/workflow.md docs/agent/change-checklist.md docs/agent/e2e-test-plan.md \
  /path/to/project/docs/agent/
```

### Duaer method

```bash
rsync -a .duaer/ /path/to/project/.duaer/
mkdir -p /path/to/project/.cursor/skills /path/to/project/.cursor/rules
rsync -a .cursor/skills/ /path/to/project/.cursor/skills/
cp .cursor/rules/duaer-spec.mdc /path/to/project/.cursor/rules/
cp DUADER.md /path/to/project/
```

## Precedence

1. `AGENTS.md` / agent-ops — how agents operate  
2. `DUADER.md` / `.duaer/` — what to build  
3. Product overlays (do not copy `examples/` blindly)

## Updates

Re-run `duaer init --force` (review the diff) or pin to a commit/tag. Adopters
are not auto-updated.

## Do not copy

- `examples/` — samples only
- `SOURCE.md` — provenance for maintainers
- `bin/` / `package.json` — only needed if you vendor the CLI itself
