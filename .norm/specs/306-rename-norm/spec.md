# Feature Specification: Rename duaer-spec to Norm

## Goal

Rename the product from duaer-spec / Duaer to **Norm** (an AI development
standard). npm package `ainorm` (`norm` is taken on npm); CLI `norm`.

## Decisions (confirmed by the user)

- Package `ainorm`; bins `norm` and `ainorm`; `duaer` and `duaer-spec` stay as aliases.
- Full rename: brand, CLI, `.duaer/` → `.norm/`, `DUADER.md` → `NORM.md`,
  `duaer-*` skills → `norm-*`, rule files → `norm.md` / `norm.mdc`,
  `DUAER_*` env → `NORM_*`, `~/.duaer` → `~/.norm`.
- Old installs keep working: `norm init` / `update` migrate a duaer-spec repo
  in place; `DUAER_*` env vars still apply; `~/.duaer` moves to `~/.norm` on
  first CLI run.
- Old npm package `duaer-spec` is deprecated with a pointer to `ainorm` when
  the user says to go online (not in this job).

## Out of scope

- Renaming the GitHub repo / org (links still point at `duaer-spec`).
- Publishing to npm, `npm deprecate duaer-spec`.
- Rewriting job history: past Briefs under `.norm/specs/` and past CHANGELOG entries keep old names.

## Acceptance

1. No `duaer` / `Duaer` / `DUADER` left in tracked files except repo URLs, the legacy-compat code and docs, Brief history and past CHANGELOG entries.
2. `package.json` name is `ainorm`; bins `norm`, `ainorm`, `duaer`, `duaer-spec`.
3. `norm update` on a duaer-spec repo moves `.duaer/` → `.norm/`, `DUADER.md` → `NORM.md`, the init marker, and hook commands, and removes old `duaer-*` adapters without touching other skills.
4. `DUAER_*` env vars apply when the `NORM_*` name is unset; `~/.duaer` moves to `~/.norm` once and never over an existing `~/.norm`; tests never move the real home.
5. ADR, CHANGELOG Unreleased, and E2E catalog record the rename.
6. `npm test` and `npm run test:live` pass.
