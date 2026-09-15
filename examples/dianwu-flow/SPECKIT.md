# Spec Kit 迭代约定

本仓库已接入 [GitHub Spec Kit](https://github.com/github/spec-kit)（`specify-cli` + Cursor `cursor-agent` 集成）。  
**后续功能与架构迭代默认走 Spec-Driven Development**，不再直接「口头需求 → 改代码」。

## Agent 开干前必读（顺序）

1. [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — 过程原则  
2. [`.specify/memory/project-context.md`](.specify/memory/project-context.md) — **整仓 as-is 现状**  
3. [`CORE.md`](CORE.md) — 产品应然路径  
4. 含 UI / 体验时：[`.specify/memory/design-system.md`](.specify/memory/design-system.md) — **设计 token + Mobbin 校验**  
5. [`.specify/memory/testing.md`](.specify/memory/testing.md) — **完整测试 + 专家插件**  
6. **用户可见改动**：[`.cursor/rules/i18n.mdc`](.cursor/rules/i18n.mdc) — **双语 `zh-CN`/`en`，默认真中文**  
7. 仅作历史参考：[`EVOLUTION.md`](EVOLUTION.md)（勿当作「尚未实现」清单）

## 已安装内容

| 路径 | 作用 |
| --- | --- |
| `.specify/` | 模板、脚本、workflow、extensions |
| `.specify/memory/constitution.md` | 项目原则 |
| `.specify/memory/project-context.md` | 实现现状全景 |
| `.specify/memory/design-system.md` | 设计系统 + Mobbin 体验校验 |
| `.specify/memory/testing.md` | 完整测试金字塔 + 专家审阅 |
| `.cursor/skills/speckit-*` | Cursor 技能 / 斜杠命令 |

CLI：`specify`（`uv tool install specify-cli`）。验证：`specify version` / `specify check`。

## 标准迭代路径

**生产级变更（推荐完整路径）：**

1. `/speckit-constitution` — 原则变更时才改  
2. `/speckit-specify` — 写清 what / why / 验收（不谈技术栈细节）  
3. `/speckit-clarify` — 消歧（可选）  
4. `/speckit-plan` — 技术计划（**对齐 project-context**；含 UI 则对齐 design-system + **Mobbin 对照摘要**）  
5. `/speckit-checklist` — 需求质量清单（可选）  
6. `/speckit-tasks` — 可勾选任务拆解（UI 任务含 Mobbin 校验勾选）  
7. `/speckit-analyze` — 规格/计划/任务一致性（可选）  
8. `/speckit-implement` — 按 tasks 实现；改架构更新 `project-context.md`；改视觉更新 `design-system.md`；**用户可见文案同步双语 messages**  
9. `/speckit-converge` — 对照规格查漏，缺则补 tasks 再实现  

**小功能可缩短为：** `specify` → `plan` → `tasks` → `implement` → `converge`。

**热修（不可跳过 Spec）缩短为：** `specify`（标明 hotfix）→ `tasks` → `implement` → `converge`；plan 可并成短文，不可省略 specify / converge。

## 文档冲突怎么判

**代码 ≈ project-context > design-system（视觉）> CORE > Constitution > EVOLUTION。**

## 设计与 Mobbin

用户可见体验的新增/演进：遵守 `design-system.md`，并用 **Mobbin MCP** 对照真实 App 流程后再实现；plan/PR 留对照摘要。详见该文件 §4。

## 完整测试

触及核心路径的变更按 `.specify/memory/testing.md` 执行 L0–L6（含 **Playwright `npm run test:e2e`**、Live/Smoke、Bugbot/Security、Spec Kit converge）。默认 feature **要求写测试任务**；一键门禁 `npm run test:full`。

## Agent 执行约定

在本仓库接到「做功能 / 改核心路径 / 迭代 / **热修**」类任务时，Agent 应：

1. 按上文顺序读完必读文档，并遵守 `GIT.md` / `.cursor/rules/git-flow.mdc`  
2. 功能：从 `develop` 开 `feat/*`；热修：从 `main` 开 `fix/*`  
3. 若无活跃 feature：走 `/speckit-specify`（热修也要，spec 里标明 hotfix）  
4. 有 `tasks.md` 则按任务实现并勾选  
5. 单测之后用真实账号在浏览器走改动路径，再合 `develop`；没问题再合 `main` 部署  
6. 实现后建议 `/speckit-converge`  

**热修不可跳过 Spec。** 仅允许缩短为：`specify`（hotfix）→ `tasks` → `implement` → `converge`；plan 可并成短文，不可省略 specify / converge。

## Git 扩展

已装 `git` extension：`/speckit-git-feature` 等。活跃 feature 以 `.specify/feature.json`（若存在）为准。

**长期分支**：`main`（正式）、`develop`（开发）。功能从 **develop** 拉 `feat/…`，热修从 **main** 拉 `fix/…`。合并顺序与账号实测见 [GIT.md](GIT.md) 与 `.cursor/rules/git-flow.mdc`。`/speckit-git-feature` 前先切到对应基线（功能 → develop，热修 → main）；功能默认 `feat/{number}-{slug}`。
