# Feature Specification: CLI update check + self-update

**Feature Branch**: `feat/self-update`

**Created**: 2026-09-16

**Status**: Active

## Goal

When a newer `duaer-spec` is on npm, the CLI (and live desk) **notifies** the
user. `duaer self-update` upgrades the global CLI. Default is prompt-only —
no silent global install.

## In scope

- Shared update-check (npm registry, 24h cache under `~/.duaer/`)
- Print hint on `duaer live` / common commands; `DUAER_NO_UPDATE_CHECK=1` skips
- `duaer self-update` → `npm i -g duaer-spec@latest`
- Live `/api/health` + small UI notice when outdated
- Docs EN/ZH (EN no CJK)

## Acceptance

1. Outdated install prints a one-line upgrade hint (cached ≤24h)
2. `duaer self-update` runs global npm install of latest
3. Live health exposes `update.outdated` / versions; UI shows a short notice
4. Env `DUAER_NO_UPDATE_CHECK=1` disables the check
