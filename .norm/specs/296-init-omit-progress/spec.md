# Feature Specification: Init omits duaer-spec job progress

## Goal

`duaer init` and the published package install the Duaer method skeleton. The adopting project gets an empty `.duaer/specs/` for its own jobs. Brief history and `active-job.json` from this repository stay here.

## In scope

- `installMethod` skips `.duaer/specs/` and `.duaer/active-job.json`
- A fresh init creates an empty `.duaer/specs/`
- `package.json` `files` excludes those paths from the published package
- An adopting project's existing specs and `active-job.json` stay in place on `init --force` / `update`

## Out of scope

- Deleting this repository's `.duaer/specs/`
- Removing progress already copied into projects initialized earlier

## Acceptance

1. `duaer init <empty-dir> --method` writes method files (`memory/testing.md`, `templates/spec-template.md`) and an empty `.duaer/specs/`, and does not write `.duaer/active-job.json` or `.duaer/specs/295-ponytail-init/`.
2. When the target already has its own spec and `active-job.json`, `duaer init <dir> --method --force` leaves those files and still does not add `295-ponytail-init`.
3. `npm pack --dry-run` file list has no `.duaer/specs/` entries and no `.duaer/active-job.json`, and still includes `.duaer/memory/testing.md`.
