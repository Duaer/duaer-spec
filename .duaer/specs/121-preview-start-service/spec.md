# Brief: Start preview service so results are viewable

## Goal

「打开看看」must open a running result: start the local service when needed.
Agents must start the service before accept. Keep「打开文件夹」. Use plain
human copy (no Finder jargon).

## In scope

- `POST /api/preview/ensure` starts localhost preview if not listening
- Desk CTA ensures then opens; optional auto-ensure when result appears
- Prompts / tasks: must start service + set preview.url
- Human-language i18n for result panel

## Out of scope

- Embedding remote production URLs in an iframe
- Killing unrelated user processes

## Acceptance

1. Clicking 打开看看 on a localhost service starts it if down, then opens URL
2. Agent start command requires starting the service before accept
3. Open folder remains; copy is plain language
4. L0 + unit + L3
