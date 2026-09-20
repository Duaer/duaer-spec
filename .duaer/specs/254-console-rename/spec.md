# Rename product surface「台面」→「控制台」

## Goal

User-visible Chinese copy must say **控制台** (not 台面) for the FDE product
surface. English parallel: **console** (not desk) in the same user-facing spots.
Brand form: **Duaer 控制台** / **Duaer console**.

## In scope

- live-dev i18n (zh-CN + en + locales that say desk/台面)
- HTML fallbacks, employee-catalog, duaer-live user messages, README.zh-CN,
  worker-models.zh-CN, brand rules (AGENTS / ai-ui-copy), brand tests
- README.md “live desk” → “console” where it names the product surface

## Out of scope

- Renaming DOM ids (`#desk`), `deskKind`, `live-desk.md` filename, or historical
  Brief folders
- Rewriting entire CHANGELOG history

## Acceptance

1. No user-facing「台面」in zh i18n / README.zh-CN for the product surface.
2. Setup strings use「Duaer 控制台」/ “Duaer console”.
3. Brand rules prefer 控制台 / console.
4. Brand + live smoke tests updated and pass.
