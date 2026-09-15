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

Tag meaningful snapshots (`v0.x.y`) when adopters should pin. Bump
`package.json` `version` with the tag. Summarize method deltas in the
tag/release notes (phases, paths, breaking renames).

Publish path for adopters:

```bash
npx github:fujiezee/duaer-spec@v0.1.0 duaer init --here
```

## Examples

Keep `examples/` from becoming defaults. Product overlays must not override
this repository's `main` + worktree policy.

## Adopters

Projects that copied files do not auto-update. They re-run [ADOPT.md](../ADOPT.md)
when they want a newer method revision.
