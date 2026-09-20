# 230 — Confirm workers graph button busy state

## Goal

When the operator clicks「确认人数并生成派工图」, the button shows a spinning/busy state until the dispatch graph is rendered; only then can「查看派工图」be used.

## Acceptance

1. Click starts busy/spinning on the confirm button (disabled, busy label).
2. Desk POSTs task IR to `/api/architecture/render` and waits for success.
3. On success: busy ends, `dispatchGraphReady` is true, graph view is enabled.
4. On failure: busy ends, error shown, graph stays gated.
5. Tests/docs updated; verification passes.
