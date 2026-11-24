Round: 1
Commit: 1bbf050f6f1cfb6b359304dda30b5316c66a29dc

What this change does: Points every link to the repository and the intro site at the new home, `github.com/fujiezee/norm` and `fujiezee.github.io/norm`: package metadata, README and docs, desk header and setup links in all locales, the desk's default repo for the GitHub stars check, the trusted-publishing docs, and the tests that pin those links. Load assumed: one developer; the desk calls the GitHub API at most every 5 minutes.

Looks good. Ship.

Checked: `resolveGithubRepoFromPackage` parses `fujiezee/norm` from the new `repository.url`, and `DEFAULT_GITHUB_REPO` matches it; no absolute `/duaer-spec/` paths are left in `site/` or `web/`, so Pages serves under `/norm/`; the remaining `duaer-spec` strings are the spec-kit example URL, compat code and its tests, and job history; the trusted-publishing rows were also wrong before (`Norm` from the first rename) and now read `fujiezee` / `norm`; `npm test` 302 pass, `npm run test:live` pass.

Verdict: Ship.

Not checked: the stars check returns an error until the GitHub repository is actually moved; that happens right after this merge.
