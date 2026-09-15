# Adopt duaer-spec

Onboard a **digital employee** into another repository: install the Duaer
delivery OS (method) and the agent-ops contract (how they are allowed to work).

## Recommended: CLI

From the target project (Node 18+):

```bash
npx duaer-spec init --here

# Pin a release
npx github:fujiezee/duaer-spec@v0.1.1 duaer init --here

# Lite (method only) / ops only / other integration branch
npx duaer-spec init --here --method
npx duaer-spec init --here --ops --branch develop
```

From a clone of this repo:

```bash
node bin/duaer.mjs init /path/to/project --all
node bin/duaer.mjs check /path/to/project
```

`--force` overwrites managed files.

Then:

1. **Orient** — edit `.duaer/memory/constitution.md` and `project-context.md`
2. **Confirm workplace** — `docs/baseline.md` (integration branch)
3. **Assign → work → accept** — `/duaer-specify` → `/duaer-plan` → `/duaer-tasks` → `/duaer-implement` → `/duaer-converge`

A job without Spec is not assigned. A change that fails converge is not accepted.

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

1. `AGENTS.md` / agent-ops — how employees operate  
2. `DUADER.md` / `.duaer/` — what to build  
3. Product overlays (do not copy `examples/` blindly)

## Updates

Re-run `duaer init --force` (review the diff) or pin to a commit/tag. Adopters
are not auto-updated.

## Do not copy

- `examples/` — samples only
- `SOURCE.md` — provenance for maintainers
- `bin/` / `package.json` — only needed if you vendor the CLI itself
