# Feature Specification: Keep iterate + bug CTAs after deploy

## Goal

Once the result bar is showing (including after deploy), operators can still
start **再改一版** and **修 bug**. Deploy is not an end state — iterations and
defect feedback continue on the same project.

## Acceptance

1. When the result (`previewPanel`) is visible and the desk is not inside an
   active revise/bug dialogue, both「再改一版」and「修 bug」stay available —
   including while status is `revising` for deploy / a prior wave.
2. CTAs remain hidden only during active revise dialogue / when `deskKind=bug`
   (bug path already owns the card).
3. live-desk + E2E note; L0 + smoke/marker + stamp.

## Out of scope

- Changing deploy pipeline itself
- Auto-starting revise after deploy
