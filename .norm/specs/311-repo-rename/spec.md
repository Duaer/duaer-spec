# Feature Specification: Move the repository to fujiezee/norm

## Goal

Rename the GitHub repository to match the product: `Duaer/duaer-spec` → `fujiezee/norm` (user's choice).

## Acceptance

1. Tracked files point at `github.com/fujiezee/norm` and `fujiezee.github.io/norm` (package metadata, docs, desk links, `NORM_GITHUB_REPO` default, tests, trusted-publishing docs). Example URLs, compat code and job history keep old names.
2. ADR-004 and CHANGELOG Unreleased record the move.
3. `npm test` and `npm run test:live` pass.
4. The GitHub repository is `fujiezee/norm`; the local `origin` remote points there; `develop` and `main` are pushed.
5. GitHub Pages serves the site at `https://fujiezee.github.io/norm/`.
