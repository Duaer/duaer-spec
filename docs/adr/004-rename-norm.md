# ADR 004: Rename duaer-spec to Norm

## Status

Accepted

## Context

The product is an AI development standard. "duaer-spec" did not say that, and
the `-spec` suffix contradicted the pitch that users never operate Spec phases.
The npm name `norm` is taken.

## Decision

1. Brand **Norm**; npm package `@fujiezee/norm` (npm refused `ainorm` as too close to `unorm`); CLI `norm`.
2. Installed layout: `.norm/`, `NORM.md`, `norm-*` skills, `norm.md` /
   `norm.mdc` rules, `NORM_*` env vars, `~/.norm` home.
3. Compatibility (`bin/legacy-names.mjs`):
   - No `duaer` / `duaer-spec` bin aliases: they would clash with a global `duaer-spec` install (`EEXIST`). The deprecated `duaer-spec` package tells users to `npm rm -g duaer-spec` first.
   - `DUAER_*` env vars fill unset `NORM_*` names.
   - The first CLI run moves `~/.duaer` to `~/.norm` when `~/.norm` is absent.
   - `norm init` / `update` move a repo's `.duaer/`, `DUADER.md`, init marker,
     and hook commands to the new names and remove the old `duaer-*` adapters.
4. The GitHub repository moves from `Duaer/duaer-spec` to `fujiezee/norm`
   (GitHub redirects old repo links). The intro site moves to
   `https://fujiezee.github.io/norm/`; the old Pages URL does not redirect.

## Consequences

- Existing installs upgrade with one `npx @fujiezee/norm update`.
- Desk UI preferences kept in browser storage under old key names reset once.
- Job history (past Briefs, past CHANGELOG entries) keeps the old names.
