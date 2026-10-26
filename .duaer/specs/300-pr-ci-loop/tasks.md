# Tasks: PR + CI merge loop

- [x] T001 `pr.json` opt-in config (`enabled`, `base`); absent or disabled → unchanged
- [x] T002 `parsePrState`: none / closed / pending / fail / changes / ready / merged / stuck; rounds = failed heads
- [x] T003 `prStatus` via `gh`: by `pr.url`, else the branch's open PR; head branch must match; error state
- [x] T004 `jobGate`: review first, then merged PR in PR mode; `duaer check` / `duaer job` use it
- [x] T005 Stop hooks use `jobGate`; stuck stays silent
- [x] T006 Stop hook finds FDE jobs via `active-job.json` `specDir`
- [x] T007 Desk: `prGateReopen` after review passes; `gh` cached 30 s; quiet while pending / stuck
- [x] T008 Desk dispatch and revise prompts switch to the PR merge step in PR mode
- [x] T009 Progress line for PR states in all 11 locales; deliverables PR link
- [x] T010 Rules, `AGENTS.md`, `duaer-do`, branching-and-release § PR mode, live-desk, README (en, zh-CN), E2E-225, CHANGELOG
- [x] T011 Tests `test/pr-gate.test.mjs` (fake `gh`), specDir hook test; `npm test` and `npm run test:live` pass
- [x] T013 Review R1 #1: staleness only on the job branch (also fixes the 0.27.8 review gate)
- [x] T014 Review R1 #2: CI rounds count only the PR's commits
- [x] T015 Review R1 #3: cache confirmed merge (`pr-gate.json`); hook quiet on `gh` error
- [ ] T012 Ponytail review of this job's diff passes
