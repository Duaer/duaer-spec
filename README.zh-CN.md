# duaer-spec

**Duaer** 把 AI 编程助手变成**数字员工**：你用自然语言提需求，它自己跑 Spec → 实现 → 按 `.duaer/memory/testing.md` 做风险分级验证 → 验收；只有交接干净才算完成。

你**不用**操作流程。装一次之后，在 **Cursor** / **Claude Code** / **Codex** / **Copilot** / **Windsurf** / **Cline** / **Continue** / **Gemini** / **Aider** 里说话即可。

`init` / `update` 会写入各宿主适配文件（详见 [`ADOPT.md`](ADOPT.md)）。

## 安装

```bash
npx duaer-spec init --here
```

## 更新

```bash
npx duaer-spec update
```

若你改过本地 constitution / baseline / `handoff.json` 命令，看一眼 `git diff` 即可。

## 必须有的分支

| 分支 | 作用 |
|---|---|
| `main` | 生产 / 正式上线 |
| `develop` | 日常集成、联调 |
| `feat/<name>` | 功能 → 合进 `develop` |
| `fix/<name>` | 缺陷 → 合进 `develop`（紧急从 `main` 出，再回补 `develop`） |

不同问题怎么上线：[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)

合并后：`duaer handoff [--run]` 在 `develop` 上重启本地服务（命令写在 `.duaer/handoff.json`）。

## 现场开发（网页确认台）

在**已 init 的业务仓库**根目录：

```bash
npx duaer-spec live
# 或：npm run live（在 duaer-spec 本仓）
```

浏览器打开提示的地址。多轮对话弄清需求 → 改确认卡四块 → 点「需求无误，开始干活」会写入 `.duaer/specs/`，并给出可复制给数字员工的开工说明。

### 目录不要同名套娃

Worktree 是整仓副本，Brief 在仓库内的 `.duaer/specs/`：

```text
正确: .worktree/feat-login/.duaer/specs/002-login/spec.md
错误: .worktree/002-login/.duaer/specs/002-login/spec.md   ← worktree 名不要用 specs 目录名
```

英文源：[`README.md`](README.md) · 采纳细节：[`ADOPT.md`](ADOPT.md)
