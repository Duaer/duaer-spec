# 227 — Desk project sessions in SQLite

## Goal

Store FDE project desk sessions in SQLite under `~/.duaer/live/desk.sqlite`, with automatic import of legacy JSON and a versioned schema for upgrades.

## Why

Whole-file JSON rewrites for every persist are slow. Users who already have `project-chats/*.json` must keep their data when they install or upgrade duaer-spec.

## Acceptance

1. `readProjectChat` / `writeProjectChat` use SQLite; public API paths stay the same.
2. On first open of a live root, existing `project-chats/*.json` sessions are imported; re-open does not duplicate.
3. The database stores `schema_version`; opening a newer duaer-spec runs migrations in order.
4. `engines.node` requires a Node that ships `node:sqlite`.
5. Unit tests cover round-trip, JSON import, and schema version.
