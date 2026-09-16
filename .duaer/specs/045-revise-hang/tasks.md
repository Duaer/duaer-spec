# Tasks

- [x] T1 Add a bounded `spawnSync` wrapper that turns a timeout into a clear error
- [x] T2 Bound every git call on the request path (plumbing 20s, `worktree add` 60s)
- [x] T3 Bound `ensureDuaerInstalled()` (120s) and `whichCmd()` (5s)
- [x] T4 Give `callChatModel()` / `streamChatModel()` an AbortController timeout
- [x] T5 Add E2E-046 to `docs/agent/e2e-test-plan.md`
- [x] T6 Verify: blocked `git worktree add` now returns a 4xx instead of hanging
- [x] T7 Verify: normal revise still enqueues into `.duaer/live-terminal/jobs/`
- [x] T8 Stamp `delivery.json` accepted
