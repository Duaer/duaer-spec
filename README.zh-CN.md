# duaer-spec

**Duaer** 把 AI 编程助手变成**数字员工**：你用自然语言提需求，它自己跑 Spec → 实现 → 验收；只有交接干净才算完成。

你**不用**操作流程。装一次之后，在 **Cursor**、**Claude Code** 或 **Codex** 里说话即可。

`init` / `update` 会写入 `.cursor/`、`.claude/`（+ `CLAUDE.md`）、以及 Codex 的 `.agents/skills/`。

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

### 目录不要同名套娃

Worktree 是整仓副本，Brief 在仓库内的 `.duaer/specs/`：

```text
正确: .worktree/feat-login/.duaer/specs/002-login/spec.md
错误: .worktree/002-login/.duaer/specs/002-login/spec.md   ← worktree 名不要用 specs 目录名
```

英文源：[`README.md`](README.md) · 采纳细节：[`ADOPT.md`](ADOPT.md)
