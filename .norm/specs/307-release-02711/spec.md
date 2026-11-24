# Feature Specification: Release 0.27.11

## Goal

Publish 0.27.11: duaer-spec is renamed to Norm (npm `ainorm`, CLI `norm`).

## Acceptance

1. `package.json` is `0.27.11`; CHANGELOG has a `0.27.11` section and an empty Unreleased section.
2. `develop` is pushed and promoted to `main`; tag `v0.27.11` is on `main`; the GitHub Release is published.
3. npm `ainorm` latest is `0.27.11`.
4. npm `duaer-spec` is deprecated with a pointer to `ainorm`.
