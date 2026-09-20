# npm Trusted Publishing（怎么弄）

不用长期 `NPM_TOKEN`。npm 只接受**你指定的** GitHub Actions 工作流用 OIDC 发版。

官方文档：https://docs.npmjs.com/trusted-publishers/

英文版：[`npm-trusted-publishing.md`](npm-trusted-publishing.md)

## 1. 在 npm 网站配置（一次性）

1. 打开包页：https://www.npmjs.com/package/duaer-spec  
2. 点 **Settings**（需已登录且是 maintainer）  
3. 找到 **Trusted Publisher** → 选 **GitHub Actions**  
4. 填写：

| 字段 | 填什么 |
|---|---|
| Organization or user | `Duaer` |
| Repository | `duaer-spec` |
| Workflow filename | `npm-publish.yml`（**只要文件名**，不要 `.github/workflows/`） |
| Environment name | 留空（除非你在 GitHub 建了 Environment） |
| Allowed actions | 勾选 **npm publish** |

5. Save

名字必须和仓库里真实文件一致：`.github/workflows/npm-publish.yml`。

## 2. 仓库侧（已就绪）

工作流：`.github/workflows/npm-publish.yml`

- `permissions.id-token: write` — 允许发 OIDC  
- `npm publish` — **不**再依赖 `secrets.NPM_TOKEN`  
- 触发：创建 GitHub Release，或手动 **Actions → Publish npm package → Run workflow**

## 3. 以后怎么发新版本

```bash
# 1. bump package.json version + CHANGELOG
# 2. merge to main
# 3. tag & release
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
gh release create v0.1.1 --generate-notes
```

Release 发布后，workflow 会自动 `npm publish`。

也可在 GitHub → **Actions** → **Publish npm package** → **Run workflow** 手动跑（用于验证 Trusted Publisher 是否配好）。

## 4. 常见失败

| 现象 | 原因 |
|---|---|
| `ENEEDAUTH` | ① Actions 里 npm &lt; 11.5.1（本仓库已强制升到 npm@11）；② 网站上 workflow 文件名写错；③ Trusted Publisher 的 Allowed actions 只勾了 stage、没勾 **npm publish** |
| 404 | 配置未 Save，或 repository / 用户名大小写不一致 |
| OIDC 相关错误 | 工作流缺 `id-token: write` |
| `cannot publish over existing version` | **鉴权已成功**，只是版本号已存在；下次先 bump `package.json` 再发 |

npm 官方要求：**Node ≥ 22.14** 且 **npm CLI ≥ 11.5.1**。

## 5. 和 token 的关系

- 配好 Trusted Publishing 后：**不必**再把 npm token 放进 GitHub Secrets  
- 聊天里用过的 token 仍应吊销  
- 本机偶尔手发：继续用 OTP 或本机 token，与 CI 无关
