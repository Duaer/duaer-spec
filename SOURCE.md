# Source (provenance)

**duaer-spec** is an independent standards repository:
https://github.com/fujiezee/duaer-spec

This file records where early material was extracted from. Those products are
**not** dependencies of duaer-spec. Runtime behavior and git policy live only
in this repository's `AGENTS.md`, `docs/agent/`, and `kit/`.

## Agent ops (generalized)

Originally adapted from a desktop-product agent workflow (isolation, R1–R6,
Issue/PR gates). Product-specific gates (marketplace diagnosis, desktop release
surfaces, Electron suite names) were removed for the standalone package.

## Spec Kit

| Item | Origin | Location here |
|---|---|---|
| Portable scaffold / skills | Generalized Spec Kit + Cursor skills | `kit/` |
| Official Spec Kit snapshot | https://github.com/github/spec-kit | `vendor/github-spec-kit/` (see `docs/maintaining.md`) |
| Optional product overlay sample | Third-party product conventions | `examples/dianwu-flow/` |

Refresh vendor with `node scripts/sync-upstream-spec-kit.mjs` or the weekly
GitHub Action. Promoting into `kit/` is intentional and separate.

## Precedence

`AGENTS.md` / `docs/agent/` > `kit/` > `examples/` > `vendor/`.
