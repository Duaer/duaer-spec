# Tasks: Enforced Ponytail review gate

- [x] T001 Shared gate `.duaer/hooks/review-gate.mjs`: parse `review.md` (verdict, round, commit), stale check, docs-only waiver
- [x] T002 `duaer check` / `duaer job` apply the gate to the active job
- [x] T003 Stop hook entry: Claude Code `decision: block`, Cursor `followup_message`; loop guard
- [x] T004 Stop hook also checks jobs in `.worktree/*`
- [x] T005 `init` / `update` copy Ponytail skills to `.claude`, `.cursor`, `.agents`
- [x] T006 `init` / `update` merge stop hooks into `.claude/settings.json` and `.cursor/hooks.json`, keeping existing entries, idempotent
- [x] T007 Feature and bug task pools add a review task before the accept stamp (last lane)
- [x] T008 Desk reopens an accept that fails review and nudges the regression lane; stuck after 2 rounds stops nudging
- [x] T009 Progress line shows the review state in all 11 locales
- [x] T010 Deliverables page shows `review.md`
- [x] T011 Rules, `AGENTS.md`, `duaer-do` skill: Ponytail coding + review before accept
- [x] T012 Docs: README (en, zh-CN), live-desk.md, E2E-224, CHANGELOG
- [x] T013 Tests `test/review-gate.test.mjs`; `npm test` and `npm run test:live` pass
- [x] T014 Version `0.27.8`; this repo dogfoods the stop hooks
- [x] T016 Review R1 #1: a stale review restarts at Round 1
- [x] T017 Review R1 #2: desk reopen as tested `reviewGateReopen`
- [x] T018 Review R1 #3: JSDoc back on `buildBugTaskPool`
- [ ] T015 Ponytail review of this job's diff passes (`review.md`, Verdict: Ship.)
