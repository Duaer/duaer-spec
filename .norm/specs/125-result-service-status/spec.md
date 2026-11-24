# Feature Specification: Result panel service status

## Intent

Clean up the accepted-result block so it is readable, shows whether the local
preview service is listening, and offers one-click start when it is down.

## Why

The result area stacked title, version label, “本地服务”, history, and revise CTA
with a duplicate panel in Progress — hard to scan and no clear start action.

## In scope

- Single result panel (middle column); remove Progress-column duplicate
- Heading = current version label only (e.g. 结果 · 初版)
- Localhost previews: listening / down status + 启动 button → `/api/preview/ensure`
- Poll status while panel visible; open folder / open / revise stay in one action row
- Versions list only when more than one entry
- i18n + E2E/smoke

## Out of scope

- Changing how ports are inferred or which start script runs
- Embedding the app iframe in the desk

## Acceptance

1. Result block shows one heading + service status (when localhost) + one action row
2. Down service → 启动 starts it; listening shows URL/port calmly
3. No duplicate result chrome in the Progress column
4. `npm run test:live` passes
