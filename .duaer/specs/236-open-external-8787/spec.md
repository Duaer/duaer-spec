# 236 — Open desk URLs in system browser (not Cursor proxy ports)

## Goal

Stop confusing `http://127.0.0.1:64xxx/` tabs. Those are Cursor IDE Browser
proxies, not extra FDE desks. Architecture / 派工图 fullscreen must open via
the OS browser at **8787**.

## Acceptance

1. `POST /api/open-external` opens local desk URLs with OS `open`, remapping
   Cursor proxy ports (`:64074`, …) onto `http://127.0.0.1:8787`.
2. Desk present / 派工图 / architecture fullscreen use that API and always
   canonicalize to `:8787` (never `window.location.origin` / proxy).
3. Agent rule clarifies high ports are Cursor Browser, not duaer-live.
4. Tests + CHANGELOG; merge; handoff 8787.
