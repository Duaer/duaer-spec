# 228 — Desk durable state fully in SQLite

## Goal

Keep all durable FDE live data in `~/.duaer/live/desk.sqlite` (config, repos, jobs, sessions). Architecture HTML stays a regenerable disk cache. Per-machine `~/.duaer/live` is never packaged or published with duaer-spec.

## Why

Sessions alone left config / repos / jobs on JSON and directories. Operators expect one database; install/upgrade must import legacy files automatically. Local desk data must not ship to other users.

## In scope

1. Schema migration v2: `desk_kv` (config, repos) + `jobs` (id + files map).
2. On open: import legacy `config.json`, `repos.json`, and `jobs/*/…` when missing from the DB; do not delete legacy files.
3. Runtime read/write for config, repos, and live jobs use SQLite as source of truth; job directories are materialized so existing Brief paths keep working.
4. Docs/ADR/CHANGELOG/E2E note; unit tests for import + round-trip.

## Out of scope

- Publishing or bundling any user's `~/.duaer/live`
- Moving `architecture/` HTML into SQLite (regenerable cache)
- Moving product-repo worktree Briefs (those stay in the product repo)

## Acceptance

1. Config and repos load/save via SQLite; legacy files import once.
2. Live jobs import and round-trip (job.json / spec.md / tasks.md and other text files under the job dir).
3. Opening a newer desk runs migration to `DESK_SCHEMA_VERSION` ≥ 2.
4. Docs state that live data is local-only and never part of the npm package.
5. Targeted unit tests pass; `npm test` passes.
