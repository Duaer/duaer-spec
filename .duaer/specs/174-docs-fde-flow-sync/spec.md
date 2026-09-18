# Docs: FDE flow sync (modular desk)

## Goal

User-facing and agent docs match the shipped modular FDE desk: multi-module
messy chat, per-module confirm, late kickoff, dependency task pool, 1..N
same-CLI workers with Terminal lanes, README-on-delivery, chat Markdown.

## In scope

- `README.md` / `README.zh-CN.md` Flow
- `CHANGELOG.md` Unreleased
- `docs/agent/live-desk.md` (+ index)
- Short notes in `worker-models.md` / `.zh-CN.md`
- E2E catalog ID hygiene for modular rows + Spec mapping
- `.duaer/memory/testing.md` L3 note

## Out of scope

- Product code / UI behavior changes
- Push / promote to `main`

## Acceptance

1. README Flow describes modules → confirm → architecture → kickoff → pool/workers
2. CHANGELOG Unreleased lists modular / pool / lanes / README-on-delivery / chat MD; no stale FED branding in Unreleased titles
3. `docs/agent/live-desk.md` exists and is linked from the agent docs index
4. Modular E2E rows use unique IDs (no clash with older 101–105)
5. Docs-only Brief; no code verification required beyond L0 optional
