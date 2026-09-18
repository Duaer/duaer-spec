# Worker CLIs and other models

FED launches **digital employees** with Terminal CLIs. That is separate from the
**desk LLM** used for chat / confirm validation.

| Layer | What | Examples |
|---|---|---|
| Desk LLM | OpenAI-compatible HTTP API for the FED UI | DeepSeek API, OpenAI, custom gateway |
| Worker CLI | Coding agent that edits the product worktree | **Cursor Agent**, **Claude Code** |

Third-party packages named `deepseek` / `deepseek-tui` (now Codewhale) are
**not** supported as worker CLIs. To use DeepSeek **models** for coding, point
Claude Code (or another supported agent) at DeepSeek’s official API.

## Desk LLM (FED chat)

```bash
duaer live config --provider deepseek --api-key <key>
# or
duaer live config --base-url https://api.openai.com/v1 --api-key <key> --model gpt-4o-mini
```

## Worker: Claude Code + DeepSeek models (official)

DeepSeek documents an Anthropic-compatible endpoint. Configure Claude Code,
then choose **Claude Code** on the FED dispatch card.

Write `~/.claude/settings.json` (merge into existing `env` if present):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<DeepSeek API key>",
    "ANTHROPIC_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-v4-flash"
  }
}
```

Or export the same variables in the shell before launching FED / Terminal.

**Important:** use `https://api.deepseek.com/anthropic` (not `.../v1`).

Official guide:
[Integrate with Claude Code](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/).

Smoke test:

```bash
claude -p "Reply with exactly: pong"
```

FED dispatch launches Claude with `--permission-mode bypassPermissions` so the
employee can edit and run commands in the worktree without stepwise confirms.

## Worker: Cursor Agent

Install: `curl https://cursor.com/install -fsS | bash`

Use Cursor’s own model / account settings for the Agent CLI. FED only launches
`agent` / `cursor agent` against the product worktree.

## Other backends

DeepSeek also documents integrations for Codex and other tools:
[Agent integrations](https://api-docs.deepseek.com/quick_start/agent_integrations/).

FED still only **auto-launches** Cursor Agent and Claude Code. Other hosts can
run Duaer Briefs via their own adapters after `npx duaer-spec init --here`.

Chinese version: [worker-models.zh-CN.md](worker-models.zh-CN.md).
