Round: 1
Commit: 2c94adf0f24719feaeb7e11394f66be956619c19

What this change does: The L3 smoke test starts the desk server as a child process. It now passes `NORM_LIVE_NO_BROWSER=1`, the switch `openDeskInBrowser` in `bin/norm-live.mjs` already checks, so test runs stop opening browser tabs. Load assumed: one developer or CI running the suite.

Looks good. Ship.

Checked: `startLive` in `test/live-smoke.test.mjs` is the only test that spawns `norm-live.mjs` as a server (`legacy-names` spawns `norm.mjs update`; `live-repo-path` and `live-claude-trust` only read the source); the env name matches the check in `openDeskInBrowser`; `npm test` 302 pass, `npm run test:live` pass, and the macOS log shows zero `open` launches during the run.

Verdict: Ship.
