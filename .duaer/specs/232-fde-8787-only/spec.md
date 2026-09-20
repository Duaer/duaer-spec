# 232 — FDE desk stays on port 8787 only

## Goal

Agents must not keep starting alternate local desk URLs (e.g. `http://127.0.0.1:62489/`).
The only Duaer-spec FDE desk is **`http://127.0.0.1:8787`** via LaunchAgent `com.duaer.live8787`.

## Acceptance

1. Agent rule: never spawn `duaer-live` on a non-8787 port; reuse 8787 / kickstart only.
2. LaunchAgent / handoff: restart does not open a new browser tab every time (`DUAER_LIVE_NO_BROWSER`).
3. `duaer-live` refuses alternate ports when 8787 is the intended desk (docs + EADDRINUSE hint).
4. Docs / CHANGELOG / tests updated; merge to develop; handoff.
