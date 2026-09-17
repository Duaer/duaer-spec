# Maintaining duaer-spec

duaer-spec is the source of truth for the **Duaer** methodology. There is no
embedded upstream toolkit to sync.

## Evolving the method

| Change | Where |
|---|---|
| Process principles | `.duaer/memory/constitution.md` (+ template) |
| Templates (spec/plan/tasks/…) | `.duaer/templates/` |
| Cursor skills / slash flows | `.cursor/skills/duaer-*` |
| Method overview | `DUADER.md` |
| Agent ops | `AGENTS.md`, `docs/agent/` (incl. branching-and-release) |
| Install instructions | `ADOPT.md` |

One logical change per commit. Prefer updating skills and templates together
when a phase's contract changes.

Day-to-day work integrates on **`develop`**. See
[branching-and-release](agent/branching-and-release.md).

## Verification (this repo)

| Level | Command |
|---|---|
| L0 | `node --check bin/duaer-live.mjs` (and other touched files) |
| L3 (live desk) | `npm run test:live` |

Details: [`.duaer/memory/testing.md`](../.duaer/memory/testing.md).

## Releases (go online)

1. Land changes on **`develop`**
2. Bump `package.json` `version` and add a [`CHANGELOG.md`](../CHANGELOG.md) section
3. Promote **`develop` → `main`** (user asked to ship)
4. Tag `vX.Y.Z` on `main` and push the tag
5. Create a GitHub Release from the tag (notes from CHANGELOG)
6. npm publish via **Trusted Publishing** (preferred):
   - One-time setup: [npm Trusted Publishing](npm-trusted-publishing.md)
   - Then each GitHub Release runs `.github/workflows/npm-publish.yml` (no `NPM_TOKEN`)

Adopter install / update:

```bash
npx duaer-spec init --here
duaer self-update              # global CLI
npx duaer-spec update          # product-repo adapters
```

## Examples

Keep `examples/` from becoming defaults. Product overlays must not override
this repository's `main` + `develop` + `.worktree/` policy.

## Adopters

Projects that copied files do not auto-update. They re-run
`npx duaer-spec update` (see [ADOPT.md](../ADOPT.md)) when they want a newer
method revision. Global CLI installs can run `duaer self-update` (or
`npm i -g duaer-spec@latest`). The CLI notifies when npm has a newer release.
