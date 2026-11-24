# Feature Specification: Release 0.27.12

## Goal

Publish 0.27.12: Norm on npm as `@fujiezee/norm` (0.27.11 never reached npm), plus the L3 no-browser fix.

## Acceptance

1. `package.json` is `0.27.12`; CHANGELOG has a `0.27.12` section and an empty Unreleased section.
2. `develop` is pushed and promoted to `main`; tag `v0.27.12` is on `main`; the GitHub Release is published; the v0.27.11 Release notes say it never reached npm.
3. npm `@fujiezee/norm` latest is `0.27.12`.
4. npm `duaer-spec` is deprecated with a pointer to `@fujiezee/norm`.
