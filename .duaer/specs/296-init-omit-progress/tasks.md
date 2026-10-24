# Tasks — 296-init-omit-progress

- [x] Skip `.duaer/specs/` and `.duaer/active-job.json` when init copies the method, and create an empty `specs/` directory
- [x] Exclude those paths from the published package file list
- [x] Fresh init has method files, an empty `specs/` directory, and no packaged `active-job.json` or `295-ponytail-init`
- [x] `init --force` leaves an adopting project's own spec and `active-job.json` in place
- [x] `npm pack --dry-run` omits `.duaer/specs/` and `.duaer/active-job.json` and still lists `.duaer/memory/testing.md`
- [x] ADOPT, Chinese README, and E2E catalog describe the method skeleton and empty specs directory
