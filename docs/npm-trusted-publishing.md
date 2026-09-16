# npm Trusted Publishing

Avoid long-lived `NPM_TOKEN`. npm only accepts publishes from the **GitHub
Actions workflow you configure** via OIDC.

Official docs: https://docs.npmjs.com/trusted-publishers/

Chinese guide: [`npm-trusted-publishing.zh-CN.md`](npm-trusted-publishing.zh-CN.md)

## 1. Configure on npmjs.com (once)

1. Open https://www.npmjs.com/package/duaer-spec
2. Open **Settings** (maintainer login required)
3. **Trusted Publisher** → **GitHub Actions**
4. Fill in:

| Field | Value |
|---|---|
| Organization or user | `fujiezee` |
| Repository | `duaer-spec` |
| Workflow filename | `npm-publish.yml` (filename only, no `.github/workflows/`) |
| Environment name | leave empty unless you use a GitHub Environment |
| Allowed actions | include **npm publish** |

5. Save

The filename must match `.github/workflows/npm-publish.yml` in this repo.

## 2. Repo side (already wired)

Workflow: `.github/workflows/npm-publish.yml`

- `permissions.id-token: write` — OIDC
- `npm publish` — no `secrets.NPM_TOKEN`
- Triggers: GitHub Release published, or **Actions → Publish npm package → Run workflow**

## 3. Shipping a new version

```bash
# 1. bump package.json version + CHANGELOG
# 2. merge to main
# 3. tag & release
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
gh release create v0.1.1 --generate-notes
```

After the Release is published, the workflow runs `npm publish`.

You can also run **Actions → Publish npm package → Run workflow** to verify
Trusted Publisher.

## 4. Common failures

| Symptom | Cause |
|---|---|
| `ENEEDAUTH` | (1) Actions npm &lt; 11.5.1 (this repo forces npm@11); (2) wrong workflow filename on npm; (3) Allowed actions only has stage, not **npm publish** |
| 404 | Config not saved, or org/repo casing mismatch |
| OIDC errors | Missing `id-token: write` |
| `cannot publish over existing version` | Auth worked; version already exists — bump `package.json` next time |

npm requires **Node ≥ 22.14** and **npm CLI ≥ 11.5.1**.

## 5. Tokens

- After Trusted Publishing is configured: do **not** keep an npm token in GitHub Secrets
- Revoke any token that was pasted in chat
- Local one-off publishes can still use OTP / local token; unrelated to CI
