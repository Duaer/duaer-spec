# 200 — 打开看看 uses project start URL, not docs paths

## Goal

「打开看看」must open the **runnable product** (local service or HTML page),
never a documentation artifact such as `docs/**/*.md` even when
`delivery.preview.url` points there.

## Acceptance

1. Relative non-HTML preview paths are ignored for primary open URL.
2. After an openable delivery path, prefer inferred local service over auto
   HTML candidates when both exist.
3. Status `preview` / accepted chat link use that openable URL (not `/api/result/…/*.md`).
4. Unit + L3; merge develop.
