# 237 — Dispatch graph fails on repository evidence

## Goal

Generating the dispatch graph must not fail with
`Repository evidence requires /meta/repository.`
Task status stays on the node tag and passport sublabel, not Archify `sources`.

## Acceptance

1. Task IR has no `component.sources`.
2. Sanitize drops `sources` and incomplete `/meta/repository` so Archify does not demand a pinned repo.
3. Status still shows as tag (done / in progress / waiting); worker stays on the sublabel.
4. Tests + E2E + CHANGELOG; merge develop; handoff 8787.
