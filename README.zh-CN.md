# duaer-spec

**Duaer** 把 AI 编程助手变成能**满意交付**的**数字员工**：你用自然语言说意图，它先把需求规范成可检查的 Brief（目标 / 边界 / 验收），再按范围实现，对照验收通过才算完成。

主打的是 **规范 → 满意交付**——不是让人学会操作 Spec 阶段或 slash 命令。

你**不用**操作流程。装一次之后，在 **Cursor** / **Claude Code** / **Codex** / **Copilot** / **Windsurf** / **Cline** / **Continue** / **Gemini** / **Aider** 里说话即可。

`init` / `update` 会写入各宿主适配文件（详见 [`ADOPT.md`](ADOPT.md)）。

## 安装

```bash
npx duaer-spec init --here
```

## 更新

**全局 CLI**（已 `npm i -g duaer-spec` 时）：

```bash
duaer self-update
```

有新版本时 CLI / 现场开发会提示一行（缓存约 24 小时；`DUAER_NO_UPDATE_CHECK=1` 可关闭）。

**业务仓适配文件**（`init` 之后）：

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

浏览器打开提示地址（默认 `http://127.0.0.1:8787`）。台面**全屏宽**，三列：
**对话** | **需求 / 确认 / 派工 / 改进** | **任务进度**。

**验收（维护者 / 数字员工）：** 改现场台 UI 或确认校验门禁后，跑
`npm run test:live`（L3 冒烟：台面结构标记 + `/api/validate`，内置 mock 模型，
不产生付费 API 调用）。

**流程**

1. 多轮对话 → 确认卡（目标 / 不做 / **可检查验收** / 假设）。空泛验收（如「更好用」）过不了门禁；须**校验通过**后才能点确认；失败可自动修订  
2. 浏览 / 扫描 / 点选产品仓派工（非 git 目录会自动 `git init -b develop`；没有 develop/main/master 会自动建本地 `develop`）  
3. 只选 **CLI 数字员工**：**Cursor Agent**、**Claude Code** 或 **DeepSeek**（`npm install -g deepseek-tui`；Cursor：`curl https://cursor.com/install -fsS | bash`）  
4. 编辑「启动命令」（须以 `Duaer` 开头）→ 派工建 `.worktree/feat-*`，并打开 **Terminal** 跑对应 CLI  
5. 右侧进度列轮询 `tasks.md`；`delivery.json` 为 `accepted` 后出现 **查看成品**（`preview.url`，或自动发现 `index.html`）  
6. 成品不满意：点 **继续改进（左侧对话）**，说清原因与期望，确认改进卡（同样须校验通过）后续派（先清残留 Agent 再入队）。进度跟本轮 `R{n}-*` 任务。启动失败会回滚本轮 Brief Revision，并可再点「再派一版」；状态行显示 Terminal 忙闲/队列。  
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
