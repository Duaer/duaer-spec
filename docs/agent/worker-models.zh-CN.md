# 数字员工 CLI 与其他模型

FDE 派工用的是 **Terminal 里的数字员工 CLI**，和台面聊天用的 **Desk 模型 API** 不是一回事。

| 层级 | 作用 | 例子 |
|---|---|---|
| Desk 模型 | FDE 对话 / 确认卡校验（HTTP） | DeepSeek API、OpenAI、自建网关 |
| 数字员工 CLI | 真正改产品仓库的 coding agent | **Cursor Agent**、**Claude Code** |

开工时可启 **1..N** 个**同一种** CLI（不可混用）；并行时各占一条 Terminal 队列泳道。台面流程见英文 [`live-desk.md`](live-desk.md)。

第三方包 `deepseek` / `deepseek-tui`（现已改名 Codewhale）**不是** DeepSeek 官方 CLI，FDE **不再**把它当作数字员工。要用 DeepSeek **模型**写代码：把 Claude Code（或其它支持的工具）接到 DeepSeek 官方接口。

FDE 首次打开的「配置模型」页下方也有同样说明。

## Desk 模型（FDE 聊天）

在 FDE「配置模型」页选择：

- **DeepSeek** / **OpenAI** 预设，或  
- **Custom**：任意 OpenAI 兼容的 Base URL + API Key + Model

也可用命令行：

```bash
duaer live config --provider deepseek --api-key <key>
# 或
duaer live config --base-url https://api.openai.com/v1 --api-key <key> --model gpt-4o-mini
# 其它服务商同理：换 base-url / model
```

配置写入 `~/.duaer/live/config.json`。

## 安装 Cursor Agent

```bash
curl https://cursor.com/install -fsS | bash
```

装好后应能在终端执行 `agent` 或 `cursor agent`。模型与额度在 **Cursor 账号 / 设置**里选；FDE 只负责在产品 worktree 上启动 CLI。

## 安装 Claude Code

推荐其一：

```bash
# npm（需本机 Node）
npm install -g @anthropic-ai/claude-code

# 或官方安装脚本
curl -fsSL https://claude.ai/install.sh | bash
```

装好后探活：

```bash
claude -p "Reply with exactly: pong"
```

升级（npm）：`npm install -g @anthropic-ai/claude-code@latest`  
文档：<https://code.claude.com/docs/en/installation>

FDE 派工会带 `--permission-mode bypassPermissions`，在隔离 worktree 里自动改文件 / 跑命令；
并会为该 worktree（及产品根目录）写入 `~/.claude.json` 的 `hasTrustDialogAccepted`
（对齐 Cursor `--trust`），避免卡在「信任此文件夹」提示。

## 数字员工：Claude Code + DeepSeek 模型（官方）

DeepSeek 提供 Anthropic 兼容接口。配好 Claude Code 后，在 FDE 派工卡选 **Claude Code**。

写入 `~/.claude/settings.json`（若已有 `env`，合并进去）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<DeepSeek API Key>",
    "ANTHROPIC_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-v4-flash"
  }
}
```

也可在启动 FDE / Terminal 前用同样的环境变量 `export`。

注意：base 必须是 `https://api.deepseek.com/anthropic`，不要写成 `/v1`。

官方文档：
[Integrate with Claude Code](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/)。

## 其它后端

DeepSeek 还写了 Codex 等工具的接入说明：
[Agent integrations](https://api-docs.deepseek.com/quick_start/agent_integrations/)。

FDE **自动派工**目前只支持 Cursor Agent 与 Claude Code。日常使用以 **Cursor**、
**Claude Code** 为准：用平常话交代即可，不必学专业 Spec 流程。其它编辑器仍可
从 `npx duaer-spec init --here` 拿到可选适配（见 [`ADOPT.md`](../../ADOPT.md)）。

English: [worker-models.md](worker-models.md).
