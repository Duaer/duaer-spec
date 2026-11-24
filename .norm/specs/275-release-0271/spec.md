# Feature Specification: Release 0.27.1

## Goal

Ship 0.27.1: FDE-03 environment checklist, FDE-04 compat evidence, FDE-05
external dependency board, FDE-06 import precheck, and the patch-version
policy. Promote develop to main, publish a GitHub Release, and let npm
Trusted Publishing run.

## Acceptance

1. `package.json` is `0.27.1`; CHANGELOG has `0.27.1` and an empty Unreleased section.
2. Tag `v0.27.1` is on `main`; GitHub Release is published.
