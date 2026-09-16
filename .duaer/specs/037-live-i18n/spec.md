# Feature Specification: Live desk i18n (zh-CN + en)

**Feature Branch**: `feat/live-i18n`

**Created**: 2026-09-16

**Status**: Active

## Goal

Live desk UI supports multiple languages. Initial locales: **zh-CN** (default)
and **en**, with a visible language switcher. Preference persists.

## In scope

- Message catalogs for static + dynamic live UI copy
- Header language switch (zh-CN / en)
- Persist locale (`localStorage` key `duaer.live.locale`)
- Browser language hint on first visit (zh* → zh-CN, else en)
- Confirm card / revise card / dispatch / preview / revise CTAs translated
- Do not change confirm-card layout; i18n only for strings

## Out of scope

- Translating agent Terminal prompts (may stay bilingual later)
- Full localization of every server console log line
- Translating LLM system prompts used by `/api/chat`

## Acceptance

1. Switching to English updates visible desk copy (static `data-i18n` + dynamic
   JS strings) without a layout break
2. Reload keeps the chosen locale via `localStorage` (`duaer.live.locale`)
3. zh-CN remains default when no preference and browser language is Chinese
4. Language switcher (`#langSelect`) is visible in the header
5. E2E catalog note (E2E-038)

## Notes

- Catalogs live in `web/live-dev/i18n.js`; `app.js` imports `t` / `setLocale` /
  `onLocaleChange`
- Static files under `web/live-dev/` are served as-is by `bin/duaer-live.mjs`
  (no whitelist); `i18n.js` needs no server change
