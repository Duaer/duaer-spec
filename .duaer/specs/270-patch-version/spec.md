# Feature Specification: Patch versions for fast iteration

## Goal

Ships after 0.27.0 increment the patch number. The next release is 0.27.1.

## In scope

- Release docs and agent rules state the default bump is the last number

## Out of scope

- Cutting 0.27.1 now
- Changing npm or GitHub release automation

## Acceptance

1. Branching docs say 0.27.0 is followed by 0.27.1, not 0.28.0
2. Agent rules repeat that patch bump
