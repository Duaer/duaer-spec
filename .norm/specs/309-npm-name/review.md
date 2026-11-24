Round: 1
Commit: 6cb0c0fbe398ed30349752e32c4ea8bfacfd9dcf

What this change does: npm refused the package name `ainorm`, so the package becomes `@fujiezee/norm` (a "scoped" name: owner prefix plus name, which npm never blocks for looking like another package). The CLI is still `norm`. The `ainorm`, `duaer` and `duaer-spec` bin aliases are gone, and every install, update, self-update and registry check now uses the new name. Load assumed: one developer per machine.

**Nice to have**

1. **Old global CLIs are never told about the move** (`bin/update-check.mjs` in the published `duaer-spec` 0.27.10)
   - **What this is:** An old `duaer` CLI checks npm for a newer `duaer-spec` and prints a hint.
   - **Problem:** `duaer-spec` gets no new version, so the old CLI never prints a hint. The user only sees the deprecation warning when they run `duaer self-update` or `npm i -g duaer-spec`.
   - **Fix:** None in this repo; the `npm deprecate duaer-spec` message names the new package and the uninstall step.
   - **If we skip it:** Old users find out on their next install or self-update instead of right away.

Checked: no code reads the package name or relies on the removed bin names (`PKG.name` is unused; `live-tooling` only checks its own entry path); the scoped registry URL form `/@scope%2fname/latest` returns data for a known scoped package; `npx @fujiezee/norm …` runs the package's only bin `norm`; dropping the `duaer` / `duaer-spec` bins avoids `EEXIST` next to a global `duaer-spec`; `npm test` 302 pass, `npm run test:live` pass, `npm pack --dry-run` reports `@fujiezee/norm`.

Looks good. Ship.

Verdict: Ship.
