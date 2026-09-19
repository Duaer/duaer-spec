# Spec: Common live-desk locales beyond zh/en/ja

## Goal

Add commonly used desk languages with **complete** catalogs matching English
keys, wired into the language select and locale detection.

## Locales (in addition to zh-CN, en, ja)

| Code | Label |
|---|---|
| `ko` | 한국어 |
| `zh-TW` | 繁體中文 |
| `es` | Español |
| `pt-BR` | Português (Brasil) |
| `fr` | Français |
| `de` | Deutsch |
| `ru` | Русский |
| `vi` | Tiếng Việt |

## Acceptance

- [ ] Each new catalog has exact key parity with `en`
- [ ] Language `<select>` lists all locales; `detectLocale` / `setLocale` work
- [ ] Date/list separators and deliverables `lang` degrade gracefully
- [ ] Tests assert parity for all new locales; README notes the languages
- [ ] npm test passes
