# Feature Specification: Progress theme + bug modules survive confirm

## Goal

Light theme「派工进度」must not look dark. Desk denser / smoother. After
entering defect path (and after confirming the defect), prior requirement
module tabs must stay visible.

## Cause

`/api/confirm` (bug) returned a one-item `modules` list (`bug` only). Client
`applyConfirmSuccess` replaced `state.modules`, wiping feature tabs. Progress
`.run-block` still used fixed dark `rgba(26,40,54,…)` fills.

## In scope

- Server + client: bug confirm merges into existing modules (keep features)
- Progress column theme tokens + denser spacing / smoother scroll feel
- Docs + tests (E2E catalog)

## Out of scope

- Changing bug task pool shape or hotfix branch rules

## Acceptance

1. Enter「改缺陷」with ≥1 prior module → tabs show prior + bug; after confirm
   defect, prior tabs remain.
2. Light theme progress run blocks / meters use theme inset tokens (no near-black
   hardcodes).
3. Progress column padding/gaps tighter than pre-fix; targeted tests pass.
