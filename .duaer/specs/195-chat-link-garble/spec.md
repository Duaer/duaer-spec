# 195 — Fix garbled chat preview links

## Goal

Accepted-bubble preview links must not show broken HTML (e.g. raw
`target="_blank"` text) when the URL is `http://…/api/result/…`.

## Cause

Bare `/api/result/…` auto-link matched inside an existing `http://host/api/result/…`
href and nested/broke the `<a>` tag.

## Acceptance

1. `http://127.0.0.1:8787/api/result/…` renders as one clean clickable link.
2. Bare `/api/result/…` and `/api/artifact/…` still auto-link when standalone.
3. Unit tests cover the nested-path regression; merge develop.
