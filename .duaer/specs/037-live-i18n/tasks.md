# Tasks: Live desk i18n

- [x] T001 Add `web/live-dev/i18n.js` with zh-CN + en catalogs, `t`, `setLocale`,
      `applyDomI18n`, `initI18n`, `onLocaleChange`, `getLocale`
- [x] T002 Mark static copy in `index.html` with `data-i18n` / placeholders;
      add `#langSelect` + `.lang-switch` styles
- [x] T003 Expand catalogs for every user-visible string set from `app.js`
- [x] T004 Wire `app.js`: import i18n, replace hardcoded UI strings with `t()`,
      sync dynamic chrome on `onLocaleChange`, bind `#langSelect`
- [x] T005 Confirm `duaer-live` static serve covers `i18n.js` (directory serve)
- [x] T006 Spec acceptance + E2E-038 note
- [x] T007 Smoke-test: open live desk, switch zh-CN ↔ en, reload persists
- [x] T008 Stamp `delivery.json` accepted (parent verify / merge)
