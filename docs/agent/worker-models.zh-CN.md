# 数字员工 CLI 与其他模型

FED 派工用的是 **Terminal 里的数字员工 CLI**，和台面聊天用的 **Desk 模型 API** 不是一回事。

| 层级 | 作用 | 例子 |
|---|---|---|
| Desk 模型 | FED 对话 / 确认卡校验（HTTP） | DeepSeek API、OpenAI、自建网关 |
| 数字员工 CLI | 真正改产品仓库的 coding agent | **Cursor Agent**、**Claude Code** |

第三方包 `deepseek` / `deepseek-tui`（现已改名 Codewhale）**不是** DeepSeek 官方 CLI，FED **不再**把它当作数字员工。要用 DeepSeek **模型**写代码：把 Claude Code（或其它支持的工具）接到 DeepSeek 官方接口。

## Desk 模型（FED 聊天）

```bash
duaer live config --provider deepseek --api-key <key>
# 或
duaer live config --base-url https://api.openai.com/v1 --api-key <key> --model gpt-4o-mini
```

## 数字员工：Claude Code + DeepSeek 模型（官方）

DeepSeek 提供 Anthropic 兼容接口。配好 Claude Code 后，在 FED 派工卡选 **Claude Code**。

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

也可在启动 FED / Terminal 前用同样的环境变量 `export`。

注意：base 必须是 `https://api.deepseek.com/anthropic`，不要写成 `/v1`。

官方文档：
[Integrate with Claude Code](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/)。

探活：

```bash
claude -p "Reply with exactly: pong"
```

FED 派工会带 `--permission-mode bypassPermissions`，在隔离 worktree 里自动改文件 / 跑命令，不再逐步要确认。

## 数字员工：Cursor Agent

安装：`curl https://cursor.com/install -fsS | bash`

模型账号走 Cursor 自己的设置。FED 只负责在产品 worktree 上启动 `agent` / `cursor agent`。

## 其它后端

DeepSeek 还写了 Codex 等工具的接入说明：
[Agent integrations](https://api-docs.deepseek.com/quick_start/agent_integrations/)。

FED **自动派工**目前只支持 Cursor Agent 与 Claude Code。其它宿主可在 `npx duaer-spec init --here` 之后，用各自适配器跑 Duaer Brief。

English: [worker-models.md](worker-models.md).
