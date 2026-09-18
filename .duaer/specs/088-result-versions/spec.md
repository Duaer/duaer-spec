# Feature Specification: Result versions follow progress

**Feature Branch**: `feat/result-versions`
**Brief**: `.duaer/specs/088-result-versions/`
**Status**: Accepted

## Goal

Live desk「查看结果」tracks each accepted dispatch/revision as its own
previewable version, with a unified version list. Drop dead links after
worktree cleanup. Clear stuck「续派中」when the job is finished.

## In scope

1. Rename CTA / labels: 查看成品 → 查看结果 (EN: View result)
2. On each delivery accept (初版 + each revision), record a result version
3. Unified UI to open any still-previewable version
4. Persist previewable snapshots under the live job so artifacts survive
   worktree removal; prune entries that cannot be opened
5. Fix status/UI stuck on revising /「续派中」after delivery accepted and
   work finished (or worktree already cleaned)

## Out of scope

- Full site asset bundling beyond the preview entry file
- Changing Terminal queue semantics beyond status inference

## Acceptance

1. i18n + HTML use「查看结果」/ View result
2. `/api/status` returns `results[]` of previewable versions; grows with
   each accept; non-previewable entries omitted after worktree gone
3. Preview panel lists versions; latest opens via primary CTA
4. When delivery accepted and worktree gone (or no open revise work),
   status is `accepted` — not stuck `revising`; client clears
   `reviseDispatching`
5. L0 + L1 + `npm run test:live`; E2E catalog updated
