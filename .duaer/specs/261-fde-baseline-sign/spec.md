# Feature Specification: FDE-01 scope + acceptance baseline sign gate

## Goal

Enforce a signed scope/acceptance baseline before kickoff (联调), per WeCom
FDE pain FDE-01: no unsigned baseline may enter dispatch; post-sign scope
changes require an explicit change order and re-sign.

## In scope

- Confirm card fields: device matrix, critical paths, exception cases (feature)
- Project baseline sign (signer + time + fingerprint of confirmed modules)
- Kickoff / dispatch hard-blocked until baseline signed and fingerprint matches
- Change order: reason → unlock modules for re-confirm → clear sign → re-sign
- Deliverables page shows baseline + change history
- Docs / E2E / tests

## Out of scope

- Real e-sign / PKI
- Automatic schedule recalculation
- Cloud browser matrix execution
- Full RACI (FDE-10)

## Acceptance

1. Feature confirm without device matrix / critical paths / exception cases fails local validate
2. Unsigned baseline: 「写入 Brief 并启动」disabled or blocked with clear copy
3. After sign, kickoff allowed when fingerprint matches confirmed modules
4. Opening a change order with a reason clears the sign and returns modules to re-confirm
5. Deliverables HTML shows signer, signed time, and change reasons when present
6. `npm test` and `npm run test:live` pass

## Assumptions

- Bug desk skips the three new field requirements but still needs baseline sign before dispatch
- Worktree: `.worktree/feat-fde-baseline-sign` · Brief: `.duaer/specs/261-fde-baseline-sign/`
