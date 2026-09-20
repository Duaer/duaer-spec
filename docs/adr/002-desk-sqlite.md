# ADR 002: FDE desk sessions in SQLite

## Status

Accepted

## Context

Per-project desk sessions lived as pretty-printed JSON under
`~/.duaer/live/project-chats/`. Every persist rewrote the whole file. That
became slow as chat and task pools grew, and listing/opening many projects
paid the same cost.

## Decision

1. Store desk sessions in `~/.duaer/live/desk.sqlite` using Node's built-in
   `node:sqlite` (`DatabaseSync`).
2. Keep one row per project (`path_key`, `project_path`, `updated_at`,
   `payload` JSON). Schema is versioned in a `meta` table; open runs
   migrations in order before any read/write.
3. On first open of a live root, import existing `project-chats/*.json` that
   are not already in the database. Leave the JSON files in place for
   recovery; do not delete them.
4. Require Node `>=22.5.0` so `node:sqlite` is available without a native
   add-on.

Jobs under `jobs/`, `config.json`, and `repos.json` stay as files for now.

## Consequences

- Install/upgrade of duaer-spec does not need a separate migrate CLI: the
  desk migrates when `duaer live` (or any API that opens the desk DB) runs.
- Future columns or tables add a new migration step and bump
  `DESK_SCHEMA_VERSION`.
- Adopters on Node 18–21 must upgrade Node to use the live desk.
