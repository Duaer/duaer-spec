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

与业务仓库隔离。配置与 Brief 写在本机 `~/.duaer/live/`。

```bash
# DeepSeek（推荐）
duaer live config --provider deepseek --api-key sk-...

# 在产品仓登记，派工时点选（可选）
duaer live repo add

# 或任意 OpenAI 兼容接口
duaer live config --base-url https://api.openai.com/v1 --api-key sk-... --model gpt-4o-mini

# 启动（任意目录都行，不会写入当前项目）
duaer live
```

浏览器打开提示地址（默认 `http://127.0.0.1:8787`）。

**流程**

1. 多轮对话 → 确认卡 → 自动验收  
2. 浏览 / 扫描 / 点选产品仓派工（非 git 目录会自动 `git init -b develop`；没有 develop/main/master 会自动建本地 `develop`）  
3. 只选 **CLI 数字员工**：**Cursor Agent** 或 **Claude Code**（未装 Cursor 时页面会提示：`curl https://cursor.com/install -fsS | bash`）  
4. 编辑「启动命令」（须以 `Duaer` 开头）→ 派工建 `.worktree/feat-*`，并打开 **Terminal** 跑对应 CLI  
5. 页面轮询 `tasks.md` 进度；`delivery.json` 为 `accepted` 后出现 **查看成品**（`preview.url`，或自动发现 `index.html`）
6. 成品不满意：点 **继续改进（左侧对话）**，在对话里说清原因与期望，确认右侧改进卡后，才用 Terminal `agent --continue` / `claude --continue` 续派（`POST /api/revise`）
7. 若需求需要上线 / 公网访问：默认用 **GitHub CLI（`gh`）+ Actions** 自动化部署（静态站可参考 `.duaer/templates/deploy-github-pages.yml`；说明见英文 [`docs/agent/deploy-github.md`](docs/agent/deploy-github.md)）

### 文档语言

- 英文文档不得出现中文
- 中文文档可以夹英文术语（如 `gh`、Actions、worktree）

### 目录不要同名套娃

Worktree 是整仓副本，Brief 在仓库内的 `.duaer/specs/`：

```text
正确: .worktree/feat-login/.duaer/specs/002-login/spec.md
错误: .worktree/002-login/.duaer/specs/002-login/spec.md   ← worktree 名不要用 specs 目录名
```

英文源：[`README.md`](README.md) · 采纳细节：[`ADOPT.md`](ADOPT.md)
