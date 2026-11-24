# 185 — Structured 初版需求卡 body

## Goal

When the revise accordion expands **初版 · 需求卡** (and later version bodies), field content must render as structured blocks (paragraphs / bullet / numbered lists), not a plain escaped wall of text.

## In scope

- Desk accordion `renderReviseVersionBody` uses the same `structuredHtml` path as the middle confirm card.
- Improve `normalizeReqText` for inline `1) …；2) …` acceptance lines.
- Deliverables HTML: goal/prose fields must not shatter on Chinese顿号 `、` into many paragraphs.
- CSS so accordion nested lists match desk structured styling.
- Unit + live smoke markers; E2E catalog row.

## Out of scope

- Changing confirm-column edit UX.
- Redesigning deliverables page layout again.

## Acceptance

1. Accordion version body HTML contains `req-list` / `req-para` (or `req-empty`) for non-empty fields, not only escaped text in `<dd>`.
2. `1) a；2) b；3) c` normalizes to a numbered/list structure in desk helpers.
3. Deliverables `structuredBody(goal, { as: "prose" })` keeps a single prose paragraph when text is顿号-joined narrative (not a chip list).
4. Out-of-scope chips and numbered acceptance lists still structure correctly.
5. L0 + L1 targeted tests + `npm run test:live` pass.
