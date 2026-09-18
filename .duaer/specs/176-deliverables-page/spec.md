# Feat: stage deliverables HTML page

## Goal

Above task progress, **查看交付物** opens a **new HTML page** (generated) that
shows each FDE stage and the artifacts it produced. Requirements stage includes
a **需求文档** (version timeline) and **需求确认书**.

## In scope

- Generate standalone styled HTML from the project desk session (+ job if any)
- GET `/api/projects/deliverables?path=…&lang=zh|en` returns `text/html`
- Also write `{key}-deliverables.html` under `~/.duaer/live/project-chats/`
- Progress column entry opens the page in a new tab
- Stages: requirements → architecture → kickoff/impl → delivery → revise (if any)
- ZH/EN copy; L0 + unit + `npm run test:live`; E2E catalog + live-desk note

## Out of scope

- PDF / Feishu export
- Redesigning the three-column desk layout
- Requiring workers to write deliverables into the product repo (desk-generated only)

## Acceptance

1. With a project selected, progress column shows 「查看交付物」; click opens new tab
2. Page lists stages; empty stages show “尚未产出”
3. Requirements: timeline of 初版 + 改进 versions when present; confirmation of modules
4. Architecture / task pool / delivery / revise appear when session has them
5. HTML is self-contained (inline CSS); no XSS from card text
6. Smoke + unit tests pass
