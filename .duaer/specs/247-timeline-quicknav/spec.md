# Feature Specification: Project timeline + chat quick nav

## Goal

Treat 初版需求、再改一版、修 bug as **one chronological project timeline**
(sorted by time). Add a **快速导航** control on the chat column’s right edge
that jumps to: chat bottom · confirm card · result · progress.

## Acceptance

1. Deliverables「需求文档」timeline merges initial + revise + bug entries and
   sorts by `at` (labels: 初版 / 第 N 次改进 / 缺陷).
2. Confirming a defect card appends a `bugCards` entry (with `at`) and persists
   with project chat; revise cards also store `at` when saved.
3. Chat panel right edge has a「导航」button; menu jumps to 对话底部 / 确认卡 /
   结果 / 进度 (force-scroll, clears user-scroll hold).
4. E2E catalog + live-desk note; L0 + unit + `npm run test:live`.

## Out of scope

- Changing bug kickoff / fix/ branch rules
- Per-revision jump targets inside the quick-nav menu
- Redesigning deliverables stage chrome beyond timeline merge/sort
