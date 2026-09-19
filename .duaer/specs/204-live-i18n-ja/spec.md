# Feature Specification: Live desk Japanese locale (ja)

**Feature Branch**: `feat/live-i18n-ja`

## Goal

Add **Japanese (`ja`)** as a third FDE live-desk language beside zh-CN and en.
Users can switch to 日本語; reload keeps the choice; desk copy updates.

## In scope

- `LOCALES` includes `ja`; full catalog for all i18n keys
- Language `<select>` option; `detectLocale` for `ja*` navigator
- Deliverables `lang=ja` + date/`html lang` handling
- app.js list join / toLocaleString for ja
- task-graph Archify locale passthrough
- E2E catalog + unit/smoke markers; CHANGELOG

## Out of scope

- Translating README / intro site / worker-models.md into Japanese
- Other locales beyond `ja`

## Acceptance

1. Language select shows 日本語 (`ja`); switching updates visible desk copy
2. Reload keeps `ja` via localStorage
3. Every key present in `en` exists in `ja` (no missing-key gaps in catalog parity test)
4. Deliverables HTML accepts `lang=ja`
5. `npm test` / required live smoke still pass

## Assumptions

- Default remains zh-CN when unset; `ja` browser language can auto-detect to ja
