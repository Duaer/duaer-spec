# Maintaining duaer-spec

duaer-spec is the source of truth for the **Duaer** methodology. There is no
embedded upstream toolkit to sync.

## Evolving the method

| Change | Where |
|---|---|
| Process principles | `.duaer/memory/constitution.md` (+ template) |
| Templates (spec/plan/tasks/…) | `.duaer/templates/` |
| Cursor skills / slash flows | `.cursor/skills/duaer-*` |
| Method overview | `DUADER.md` |
| Agent ops | `AGENTS.md`, `docs/agent/` |
| Install instructions | `ADOPT.md` |

One logical change per commit. Prefer updating skills and templates together
when a phase's contract changes.

## Releases

1. Bump `package.json` `version` and add a [`CHANGELOG.md`](../CHANGELOG.md) section
2. Commit, merge to `main`
3. Tag `vX.Y.Z` and push the tag
4. Create a GitHub Release from the tag (notes from CHANGELOG)
5. npm publish via **Trusted Publishing** (preferred):
   - One-time setup: [npm Trusted Publishing](npm-trusted-publishing.md)
   - Then each GitHub Release runs `.github/workflows/npm-publish.yml` (no `NPM_TOKEN`)

Adopter install:

```bash
npx duaer-spec@0.4.0 init --here
# then in Cursor: /duaer-do <ask>
duaer status
```

## Examples

Keep `examples/` from becoming defaults. Product overlays must not override
this repository's `main` + worktree policy.

## Adopters

Projects that copied files do not auto-update. They re-run [ADOPT.md](../ADOPT.md)
when they want a newer method revision.
