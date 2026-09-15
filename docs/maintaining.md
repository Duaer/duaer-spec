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
5. npm publish:
   - One-shot: `npm login` then `npm publish --access public`
   - Or set repo secret `NPM_TOKEN` and publish via
     `.github/workflows/npm-publish.yml` (runs on Release published)

Adopter install paths:

```bash
npx github:fujiezee/duaer-spec@v0.1.0 duaer init --here
npx duaer-spec@0.1.0 init --here   # after npm publish
```

## Examples

Keep `examples/` from becoming defaults. Product overlays must not override
this repository's `main` + worktree policy.

## Adopters

Projects that copied files do not auto-update. They re-run [ADOPT.md](../ADOPT.md)
when they want a newer method revision.
