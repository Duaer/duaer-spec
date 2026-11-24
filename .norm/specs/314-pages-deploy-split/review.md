Round: 1
Commit: c6ba3d2db1667d8bfe61e40edbef9b85f84c947d

What this change does: The GitHub Pages workflow used to upload the site and deploy it in the same job, and the deploy step often could not see the artifact it had just uploaded. Now a `build` job uploads and a separate `deploy` job (`needs: build`) deploys, the same shape as GitHub's starter workflow. The adopter template that deploy employees copy gets the same split. Load assumed: one deploy per push to `main`, plus manual dispatches.

Looks good. Ship.

Checked: both files parse and list `build, deploy` with `deploy.needs = build`; `permissions` (`pages: write`, `id-token: write`) and `concurrency: pages` stay at workflow level, so both jobs keep them; the `github-pages` environment and the `page_url` output stay on the job that runs `deploy-pages`; the template's "adjust path" comment stays next to the upload step, which is where `bin/deploy-targets.mjs` (line 139) tells employees to edit the path; the push trigger paths still include `.github/workflows/pages.yml`, so this change itself triggers a deploy on `main`; `npm test` passes 302 / 302.

Verdict: Ship.

Not checked: whether the split removes every failure; GitHub gives no root cause. The first runs on `main` after promotion are the real check.
