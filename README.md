# duaer-spec

**Duaer** turns AI coding agents into **digital employees**: they take a normal
language ask, run Spec → work → accept themselves, and only claim a job done
when the handoff is clean.

You should **not** have to operate the workflow. After a one-time install, you
talk; the employee runs the process.

## One-time install

```bash
npx duaer-spec init --here
```

## Update

```bash
npx duaer-spec update
```

Then use **Cursor**, **Claude Code**, **Codex**, **Copilot**, **Windsurf**, **Cline**, **Continue**, **Gemini**, or **Aider** — describe what you want.

Install writes host adapters for each (see [`ADOPT.md`](ADOPT.md)).

中文说明：[`README.zh-CN.md`](README.zh-CN.md)

## What the employee does (by itself)

1. Writes a Brief (Spec) for the ask  
2. Implements within that Brief  
3. Checks the result and stamps accept / still-open  
4. Tells you in one line whether the job is ready for review  

Step skills and CLI checks exist for agents and power users — not as the
everyday human UI.

## Live Dev (web confirm desk)

Isolated from product repos. Config and Briefs live under `~/.duaer/live/`.

```bash
# DeepSeek（推荐）
duaer live config --provider deepseek --api-key sk-...

# 或任意 OpenAI 兼容接口
duaer live config --base-url https://api.openai.com/v1 --api-key sk-... --model gpt-4o-mini

duaer live
```

Dialogue → four-block confirm → Brief in `~/.duaer/live/jobs/` (copy into a product repo when the digital employee starts coding).

## Branches (mandatory)

| Branch | Role |
|---|---|
| `main` | Production / online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Features → `develop` |
| `fix/<name>` | Fixes → `develop` (hotfix via `main`) |

Go-live and flows by issue type:
[`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md).

**After merge:** `duaer handoff [--run]` restarts local services on `develop`
(configure commands in `.duaer/handoff.json`).

## Optional

```bash
npx duaer-spec init --here --method
```

Details: [`ADOPT.md`](ADOPT.md) · Method: [`DUADER.md`](DUADER.md) · Ops: [`AGENTS.md`](AGENTS.md)

When agent ops and method conflict, **agent ops win**.
