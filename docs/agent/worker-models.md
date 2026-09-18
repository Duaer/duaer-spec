# Worker CLIs and other models

FDE launches **digital employees** with Terminal CLIs. That is separate from the
**desk LLM** used for chat / confirm validation.

| Layer | What | Examples |
|---|---|---|
| Desk LLM | OpenAI-compatible HTTP API for the FDE UI | DeepSeek API, OpenAI, custom gateway |
| Worker CLI | Coding agent that edits the product worktree | **Cursor Agent**, **Claude Code** |

On kickoff, FDE can launch **1..N** workers of the **same** CLI (not mixed).
Each parallel worker uses its own Terminal queue lane. Desk flow:
[`live-desk.md`](live-desk.md).

Third-party packages named `deepseek` / `deepseek-tui` (now Codewhale) are
**not** supported as worker CLIs. To use DeepSeek **models** for coding, point
Claude Code (or another supported agent) at DeepSeek’s official API.

The FDE **Configure model** screen includes the same guide below the form.

## Desk LLM (FDE chat)

On the FDE setup page:

- Pick **DeepSeek** / **OpenAI**, or  
- **Custom** with any OpenAI-compatible Base URL + API Key + Model

Or via CLI:

```bash
duaer live config --provider deepseek --api-key <key>
# or
duaer live config --base-url https://api.openai.com/v1 --api-key <key> --model gpt-4o-mini
# same pattern for other OpenAI-compatible gateways
```

Saved under `~/.duaer/live/config.json`.

## Install Cursor Agent

```bash
curl https://cursor.com/install -fsS | bash
```

You should then have `agent` or `cursor agent` on PATH. Model / billing is
configured in **Cursor account settings**; FDE only launches the CLI against
the product worktree.

## Install Claude Code

Either:

```bash
# npm (requires Node on the machine)
npm install -g @anthropic-ai/claude-code

# or the native installer
curl -fsSL https://claude.ai/install.sh | bash
```

Smoke test:

```bash
claude -p "Reply with exactly: pong"
```

Upgrade (npm): `npm install -g @anthropic-ai/claude-code@latest`  
Docs: <https://code.claude.com/docs/en/installation>

FDE dispatch launches Claude with `--permission-mode bypassPermissions` so the
employee can edit and run commands in the worktree without stepwise confirms.
It also stamps `hasTrustDialogAccepted` for that worktree (and product root)
in `~/.claude.json`, matching Cursor `--trust`, so the folder-trust dialog
does not block Terminal.

## Worker: Claude Code + DeepSeek models (official)

DeepSeek documents an Anthropic-compatible endpoint. Configure Claude Code,
then choose **Claude Code** on the FDE dispatch card.

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

Or export the same variables in the shell before launching FDE / Terminal.

**Important:** use `https://api.deepseek.com/anthropic` (not `.../v1`).

Official guide:
[Integrate with Claude Code](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/).

## Other backends

DeepSeek also documents integrations for Codex and other tools:
[Agent integrations](https://api-docs.deepseek.com/quick_start/agent_integrations/).

FDE still only **auto-launches** Cursor Agent and Claude Code. Other hosts can
run Duaer Briefs via their own adapters after `npx duaer-spec init --here`.

Chinese version: [worker-models.zh-CN.md](worker-models.zh-CN.md).
