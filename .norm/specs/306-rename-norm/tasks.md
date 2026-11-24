# Tasks — 306-rename-norm

- [x] Rename duaer-named files and directories (`.norm/`, `NORM.md`, `bin/norm*.mjs`, rules, skills, assets, tests)
- [x] Rewrite names in tracked files; keep repo URLs, Brief history, past CHANGELOG
- [x] `package.json`: name `ainorm`, bins `norm` / `ainorm` / `duaer` / `duaer-spec`
- [x] Migrate old repos on `init` / `update` (dirs, marker, hooks, old adapters)
- [x] `DUAER_*` env fallback and `~/.duaer` → `~/.norm` move, skipped under `node --test`
- [x] Unit tests for the migration (`test/legacy-names.test.mjs`)
- [x] ADR-004, CHANGELOG Unreleased, E2E-227, README rename note
- [x] `npm test` + `npm run test:live` pass
- [x] Commit, ponytail review, `review.md` Ship
- [x] Review 1 #1: desk `ensureNormInstalled` migrates an old repo before the install check
- [x] Stamp `delivery.json`, merge to `develop`, handoff
