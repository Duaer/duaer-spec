# Feat: dispatch center — view system architecture per project

## Goal

On the **调度中心** (dispatch center) page, each project can show its
**系统架构** (system architecture diagram), not only the task/dispatch graph.

## Acceptance

1. Dispatch center has a view switch: 派工图 | 系统架构 (per selected project).
2. Architecture view loads that project’s saved `architecture.url` from
   `/api/projects/chat`; empty state when missing.
3. Switching projects updates both views for the selected project.
4. Architecture can open fullscreen via the same open-external path as the
   console (optional button or click).
5. i18n (zh + en minimum), live-desk / E2E row, L0–L3 smoke markers pass.
