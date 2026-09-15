# Testing expectations (template)

## Levels

- L0: lint / typecheck
- L1: unit tests for changed modules
- L2: integration tests for changed boundaries
- L3: e2e / browser for user-visible paths
- L4: manual account verification when UI or auth is involved

## Default for features

Specs and `tasks.md` must include verification tasks. Prefer automated checks;
document any manual step that cannot be automated.
