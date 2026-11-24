# ADR 004: Rename duaer-spec to Norm

## Status

Accepted

## Context

The product is an AI development standard. "duaer-spec" did not say that, and
the `-spec` suffix contradicted the pitch that users never operate Spec phases.
The npm name `norm` is taken.

## Decision

1. Brand **Norm**; npm package `ainorm`; CLI `norm` (also `ainorm`).
2. Installed layout: `.norm/`, `NORM.md`, `norm-*` skills, `norm.md` /
   `norm.mdc` rules, `NORM_*` env vars, `~/.norm` home.
3. Compatibility (`bin/legacy-names.mjs`):
   - `duaer` and `duaer-spec` remain bin aliases.
   - `DUAER_*` env vars fill unset `NORM_*` names.
   - The first CLI run moves `~/.duaer` to `~/.norm` when `~/.norm` is absent.
   - `norm init` / `update` move a repo's `.duaer/`, `DUADER.md`, init marker,
     and hook commands to the new names and remove the old `duaer-*` adapters.
4. The GitHub repository keeps its name until it is renamed separately; links
   still point at `duaer-spec`.

## Consequences

- Existing installs upgrade with one `npx ainorm update`.
- Desk UI preferences kept in browser storage under old key names reset once.
- Job history (past Briefs, past CHANGELOG entries) keeps the old names.
