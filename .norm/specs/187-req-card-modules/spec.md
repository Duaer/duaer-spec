# 187 — Module-aware structured requirements display

## Goal

初版 · 需求卡 (and confirm card structured view) must show modular card text as
real structure: `[模块名]` as section titles, numbered `1)…；2)` as lists,
顿号 out-of-scope lines as bullets — not one wall paragraph per module.

## In scope

- `structured-html.mjs`: split `[title]` sections; expand inline numbered per line
  even when multiline; chip/顿号 lines → bullets when safe
- Accordion + confirm shared `structuredHtml` path
- CSS for module section titles
- Unit tests with multi-module acceptance sample; E2E catalog; L0/L3

## Out of scope

- Changing how modules are stored in desk state
- Deliverables page redesign (may reuse similar split later)

## Acceptance

1. Text with ≥2 `[模块]` blocks renders `.req-mod` + `.req-mod-title` per module.
2. Acceptance body `1) a；2) b；3) c` under a module renders `.req-list-num` items.
3. Out-of-scope line `A、B、C、D` (short chips) renders as list items.
4. Narrative goal prose with顿号 stays one paragraph under its module.
5. L0 + unit + `npm run test:live` pass.
