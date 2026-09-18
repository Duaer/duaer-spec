<p align="center">
  <img src="docs/assets/duaer-spec-fde.svg" alt="Duaer-spec FDE" width="420" />
</p>

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
npm i -g duaer-spec@latest   # 任意旧版都可用（含没有 self-update 的版本）
duaer self-update            # CLI ≥ 0.13 后与上一行等价
```

有新版本时 CLI / Duaer-spec FDE 会提示一行（缓存约 24 小时；`DUAER_NO_UPDATE_CHECK=1` 可关闭）。

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

## Duaer-spec FDE（现场开发）

与业务仓库隔离。配置与 Brief 写在本机 `~/.duaer/live/`。
**Duaer-spec FDE** = Field Development Environment（现场开发）。

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
**对话** | **模块 / 确认 / 架构 / 开工 / 改进** | **任务进度**。细则见
[`docs/agent/live-desk.md`](docs/agent/live-desk.md)。

**验收（维护者 / 数字员工）：** 改 Duaer-spec FDE UI 或确认校验门禁后，跑
`npm run test:live`（L3 冒烟：台面结构标记 + `/api/validate`，内置 mock 模型，
不产生付费 API 调用）。

**流程**

1. 打开或新建**项目**，再聊天。话题可以乱跳：台面会演进 **`modules[]`**（模块页签）。气泡支持 **Markdown**（加粗、代码、链接）。  
2. **按模块**填确认卡（目标 / 不做 / **可检查验收** / 假设）。空泛验收过不了门禁；须校验通过才能点确认。确认只**锁住该模块卡**，**不会**立刻写 Brief 或开工。模块之间可随时切换。  
3. 关心的模块都确认完 → 审 / 确认**架构**（Archify）→ **开工（kickoff）**。开工才写 Brief，建带 **`dependsOn` 的任务池**，并分派。默认 **1** 个数字员工；可选 **N** 个同 CLI 并行。共享任务给 1 号；模块任务轮询。每个 worker 独占一条 **Terminal 队列泳道**（`live-terminal` / `live-terminal/w2`…）。  
4. 浏览 / 扫描 / 点选产品仓，或粘贴路径 / 项目名。路径不存在会自动创建；可先设**产品父目录**，再填短名在其下新建。非 git 目录会 `git init -b develop`；没有 develop/main/master 会建本地 `develop`。  
5. 只选 **CLI 数字员工**：**Cursor Agent** 或 **Claude Code**  
   - Cursor：`curl https://cursor.com/install -fsS | bash`  
   - Claude Code：`npm install -g @anthropic-ai/claude-code`（或 `curl -fsSL https://claude.ai/install.sh | bash`）  
   - 要用 **DeepSeek 等其它模型**写代码：把 Claude Code 接到对应 API，见 [`docs/agent/worker-models.zh-CN.md`](docs/agent/worker-models.zh-CN.md)。FDE「配置模型」页下方也有同样说明。  
6. 编辑「启动命令」（须以 `Duaer` 开头）→ 开工建 `.worktree/feat-*`，并为每条 worker 泳道打开 **Terminal**。  
7. 右侧进度列轮询 `tasks.md`。进度上方 **查看交付物** 会打开生成的 HTML 页（需求文档时间线、确认书、架构、任务池、交付等）。交付时数字员工先更新产品仓 **README**，再把 `delivery.json` 标为 `accepted`。然后出现 **结果**（有页面时 **查看结果**；否则 **打开项目目录**）。  
8. 成品不满意：点 **继续改进（左侧对话）** → 确认改进卡（同样须校验）→ 再确认架构（保留或重画）→ 同 worktree 续派（先清残留 Agent 再入队）。进度跟本轮 `R{n}-*`。启动失败会回滚本轮 Brief Revision；状态行按泳道显示 Terminal 忙闲/队列。  
9. 若需要上线 / 公网：在台面选 **计划托管平台**（Cloudflare / 阿里云 / AWS / GitHub Pages），说明见 [`docs/agent/deploy-targets.md`](docs/agent/deploy-targets.md)。未指定时默认 **GitHub CLI（`gh`）+ Actions**（[`docs/agent/deploy-github.md`](docs/agent/deploy-github.md)）

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
