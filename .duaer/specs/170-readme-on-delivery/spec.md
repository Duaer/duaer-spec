# 170 — Update product README on delivery

## Goal

When FDE dispatches development (kickoff or revise), the digital employee must
update the product project's README (说明文档) to match the delivered
requirements before accepting delivery.

## In scope

- Kickoff / revise agent prompts require README sync on delivery
- Task pool and detailed tasks.md include an explicit README update step
- E2E catalog + unit markers

## Out of scope

- Writing README at requirements-confirm time on the desk (before kickoff)
- Auto-updating duaer-spec package adopter docs via `npx duaer-spec update`

## Acceptance

1. Kickoff default prompt and task pool require updating product README before stamp accepted
2. Revise delivery path requires the same
3. `buildDetailedProductTasksMd` / revision tasks include README update
4. L0 + L1 targeted tests pass; E2E catalog row added

## Testing

- L0: node --check changed files
- L1: npm test (live-modules, detailed-progress, source markers)
