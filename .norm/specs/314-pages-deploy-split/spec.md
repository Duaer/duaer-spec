# Bugfix Specification: Pages deploy intermittently finds no artifact

## Symptom

`pages.yml` on `main` fails at `actions/deploy-pages@v4` with `No artifacts named "github-pages" were found for this workflow run`, although `upload-pages-artifact` in the same job reports a successful upload. 5 of the last 8 runs failed (2026-11-24); re-runs sometimes pass.

## Cause

Upload and deploy run in one job. GitHub's Pages starter workflow uploads in a `build` job and deploys in a separate `deploy` job (`needs: build`); deploying straight after the upload in the same job races the artifact listing.

## Fix

Split into `build` + `deploy` jobs in `.github/workflows/pages.yml` and in the adopter template `.norm/templates/deploy-github-pages.yml` (same pattern, used by deploy employees).

## Acceptance

1. Both workflows have a `build` job (checkout, configure-pages, upload) and a `deploy` job with `needs: build`; both parse as YAML.
2. `npm test` passes.
3. After promotion, the push-triggered Pages run on `main` succeeds and the live site has no `duaer` text.
