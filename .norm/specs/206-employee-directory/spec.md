# Feature Specification: Digital employee directory + role specialization

**Feature Branch**: `feat/employee-directory`

## Goal

Add a top-bar **数字员工** directory listing specialized employees. Seed at
least: **Implementer** and **Functional regression** (Acceptance → Playwright /
testing.md L3). Kickoff tasks carry a `role`; multi-worker dispatch prefers
verify-l3 tasks on a dedicated lane.

## In scope

- Top button + drawer (same pattern as Projects)
- Catalog: implementer + regression (capabilities copy via i18n zh/en/ja)
- Task pool `role: implement | verify-l3`; markdown shows role
- When workerCount ≥ 2, assign verify-l3 tasks to the last worker lane
- Kickoff prompts include role blurb for owned roles
- Docs / E2E / tests

## Out of scope

- New CLI runtimes (still Cursor / Claude)
- jev-ultrafast / browser-use agent
- User-editable custom employees

## Acceptance

1. Top bar has 数字员工; drawer lists implementer + regression with capability text
2. Kickoff task-pool.json tasks include `role`
3. workerCount≥2 puts verify-l3 tasks on last worker
4. Unit tests + E2E catalog row; live smoke markers if needed
