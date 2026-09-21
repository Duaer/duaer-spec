# Feature Specification: Keep baseline fields after desk refresh

## Goal

Refreshing the Duaer console must keep the four feature confirm fields
(device matrix, critical paths, exception cases, API contract) that were
already on the card.

## In scope

- Session restore copies those four fields onto each module card before the
  form is filled
- Confirm fingerprint includes `apiContract` so a later edit re-validates

## Out of scope

- Bug desk (those fields stay hidden)
- Changing validate rules

## Acceptance

1. Restoring a saved module card keeps deviceMatrix, criticalPaths,
   exceptionCases, and apiContract
2. `npm test` and `npm run test:live` pass
