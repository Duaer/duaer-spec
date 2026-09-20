# ADR 002: FDE desk durable state in SQLite

## Status

Accepted

## Context

Per-project desk sessions lived as pretty-printed JSON under
`~/.duaer/live/project-chats/`. Config, remembered repos, and live Briefs lived
as `config.json`, `repos.json`, and `jobs/<id>/`. Whole-file rewrites and many
small files made listing and persist slow. Operators also need a clear rule
that local live data never ships inside the npm package.

## Decision

1. Store durable FDE live state in `~/.duaer/live/desk.sqlite` using Node's
   built-in `node:sqlite` (`DatabaseSync`).
2. Tables:
   - `project_sessions` — one row per product project (payload JSON)
   - `desk_kv` — `config` and `repos` documents
   - `jobs` — one row per live Brief id with a `files_json` map of relative
     paths to file contents
   - `meta` — `schema_version` and import stamps
3. Schema is versioned; open runs migrations in order before any read/write.
4. On open, import legacy `project-chats/*.json`, `config.json`, `repos.json`,
   and `jobs/*` that are not already in the database. Leave legacy files on
   disk for recovery; do not delete them.
5. Job directories under `jobs/` are still materialized so agent Brief paths
   keep working; SQLite is the source of truth.
6. `architecture/` HTML remains a regenerable disk cache (not in SQLite).
7. Require Node `>=22.5.0` so `node:sqlite` is available without a native
   add-on.
8. `~/.duaer/live` is per-machine only. It is never packaged, published, or
   copied into the duaer-spec distribution. Each user gets an empty live root
   until they use the desk.

## Consequences

- Install/upgrade does not need a separate migrate CLI: the desk migrates when
  `duaer live` (or any API that opens the desk DB) runs.
- Future columns or tables add a new migration step and bump
  `DESK_SCHEMA_VERSION`.
- Adopters on Node 18–21 must upgrade Node to use the live desk.
