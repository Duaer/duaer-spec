# Maintaining duaer-spec

## Spec Kit upstream sync

Official Spec Kit: https://github.com/github/spec-kit

| Path | Role | Update cadence |
|---|---|---|
| `vendor/github-spec-kit/` | Read-only snapshot of upstream `docs/` + `templates/` | Sync often (weekly CI + on demand) |
| `kit/` | Our portable drop-in (memory, Cursor skills, conventions) | Promote carefully after review |

### Manual sync (any time)

```bash
node scripts/sync-upstream-spec-kit.mjs
# optional pin:
node scripts/sync-upstream-spec-kit.mjs --ref vX.Y.Z
```

This refreshes `vendor/` only. Review the diff, then commit:

```text
chore(vendor): sync github/spec-kit <shortsha>
```

### Promote templates into `kit/` (optional)

After reviewing vendor changes:

```bash
node scripts/sync-upstream-spec-kit.mjs --promote-templates
```

Copies the five core templates into `kit/.specify/templates/`.  
**Does not** auto-update `kit/.cursor/skills/*` — those are Cursor skill wrappers.
When upstream `templates/commands/*.md` changes behavior, update the matching
`speckit-*` skill by hand and note it in the commit.

### Weekly automation

`.github/workflows/upstream-spec-kit.yml` runs every Monday (and on
`workflow_dispatch`). If `vendor/` changes, it opens a PR:

```text
chore(vendor): sync github/spec-kit
```

Merge after a short review. Promote into `kit/` in a follow-up commit only when
the template/command delta is intentional for adopters.

### Adopter repos

Projects that copied `kit/` do **not** auto-update. Options:

1. Re-run the install steps in [ADOPT.md](../ADOPT.md) from a newer duaer-spec commit
2. Or run `specify` CLI upgrades per upstream docs, then re-overlay duaer-spec `kit/` conventions

## Other maintenance

- Agent ops live in `AGENTS.md` + `docs/agent/` — change those for process rules
- Keep `examples/` from becoming defaults
- Prefer one logical commit per sync or docs change
