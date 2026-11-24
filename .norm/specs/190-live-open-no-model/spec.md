# 190 — Live starts without model gate; open desk URL

## Goal

`duaer live` must not require a configured model before serving. Always start
the desk, open `http://127.0.0.1:<port>` in the browser, and guide the operator
to Settings when the model is missing.

## Acceptance

1. `serve()` does not exit or block when `configReady` is false.
2. After listen, the desk URL is opened (macOS `open` / Linux `xdg-open`).
3. Console copy points to in-page Settings, not “must run live config first”.
4. UI shows the desk even when not ready; Settings opens as guidance; Settings
   can be closed and reopened via the header control.
5. Chat/API that need a model still fail clearly until configured.
6. L0 + targeted tests / live smoke markers pass.
