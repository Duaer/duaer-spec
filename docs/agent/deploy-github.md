# Deploy via GitHub CLI (`gh`)

> Part of **duaer-spec** agent ops. Precedence: [`AGENTS.md`](../../AGENTS.md).  
> Language: English only.

When a user project **needs hosting or a public URL**, prefer **GitHub Actions
automated deploy driven by the GitHub CLI (`gh`)**. Do not default to
third-party host CLIs (Vercel, Netlify, Cloudflare Pages CLI, etc.) unless the
adopting project already standardizes on them.

## When this applies

The Brief goal, acceptance, or assumptions mention deploy, hosting, Pages,
publishing a site, or putting a user-facing URL online.

A deploy ask **authorizes** the remote push and `gh` steps required to publish
that deployment (still do not push unrelated branches or force-push).

## Default path (static site / GitHub Pages)

1. Ensure the product repo has a GitHub remote (`gh repo view` / `gh repo create`
   when the user wants a new GitHub repo).
2. Add `.github/workflows/deploy.yml` from
   [`.duaer/templates/deploy-github-pages.yml`](../../.duaer/templates/deploy-github-pages.yml)
   (adjust the upload `path` if the build output is not the repo root).
3. Enable Pages for GitHub Actions:
   ```bash
   gh api -X POST "repos/{owner}/{repo}/pages" \
     -f build_type=workflow \
     -f source='{"branch":"main","path":"/"}' \
     || true
   ```
   (Exact API fields may vary; `gh` interactive `gh api` / repo Settings → Pages
   is fine when the API shape differs.)
4. Promote / merge to `main` per [branching-and-release](branching-and-release.md),
   then push `main` (deploy ask counts as publish for this purpose).
5. Trigger if needed: `gh workflow run deploy.yml` (or the workflow filename used).
6. Watch: `gh run watch` / `gh run list --workflow=deploy.yml`
7. Put the public URL into `delivery.json`:
   ```json
   "preview": { "url": "https://<owner>.github.io/<repo>/", "label": "View product" }
   ```

## Non-static apps

Use the same `gh` + Actions pattern: add a project-specific
`.github/workflows/deploy.yml`, configure secrets with `gh secret set` when
required, then `gh workflow run` / push to the deploy branch. Prefer documenting
the workflow in the product repo over one-off SSH deploys.

## Checks before accept

- [ ] `gh auth status` succeeds on the machine doing deploy
- [ ] Workflow file is committed on the branch that triggers deploy
- [ ] A successful run exists (`gh run list`) or waiver is written
- [ ] `delivery.preview.url` is the public (or staging) URL when available

## Related

- [branching-and-release.md](branching-and-release.md) — go-live / promote
- [e2e-test-plan.md](e2e-test-plan.md) — E2E-025
- [AGENTS.md](../../AGENTS.md) — push / ship gates
