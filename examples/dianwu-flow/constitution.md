<!--
Sync Impact Report
- Version change: 1.9.0 → 1.10.0 (MINOR: III 补渠道能力必须拆单动词、由用户需要组装)
- Modified principles: III 单能力（飞书/企微/邮件及以后同类不得做全能 Agent）
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# 点物 Flow Constitution

## Core Principles

### I. 先编排、再补缺、后验收（NON-NEGOTIABLE）

一次创作的完成态是：**可记录的编排 + 可执行且有夹具的 Agent + 整链验收通过**。  
分析只做理解与设计；写码只补缺口；审核只核单 Agent 能力；验收判定整链是否达标。四者不得混岗。积木单测绿不等于流程验收绿。

### II. Agent 蜂群优先，禁止未检索就造能力

编排必须经 **Catalog Brain**（search / exists / get）查阅现有 Agent 注册表。  
模型不得编造未在目录中的 slug。流程可以很长，**Agent 种类必须慢长**。

### III. Agent 单能力；两岗补缺（NON-NEGOTIABLE）

Agent MUST **功能单一**（一个动词）。**内置 Agent MUST 功能最小化**。  
流程可以很长，**Agent 种类必须慢长**。本条是产品核心，**禁止为赶验收改松**。

**渠道与外部能力**（飞书、企微、邮件及以后同类）MUST 拆成可拼的单动词 Agent（如收 / 回 / 发各一枚），由用户需要或官方模板组装成流程。MUST NOT 做一个「某渠道全能」或「听+回+发」胖 Agent；MUST NOT 把可拆动词藏在勾选、宿主函数或模板捷径里。入站落库（事件写入消息库、邮件 Routing 写入收件箱）是基础设施，不是 Catalog Agent。模板只拼已有原子，不新造捆包 Agent。

补缺分两岗，**禁止混岗**（尤其禁止把写码模型用在研发补群上）。

**岗甲 · 研发补群**（产品负责人在对话里提出「用户要什么」）  
Cursor Agent 自己理解需求，对照 Catalog：现有原子能否满足、差哪些单动词。能拼则只出配方、不新造。差可复用单动词则 **自己在仓库把合适 Agent 写入蜂群**（最小化扩展 builtin，或宏）。**禁止**调用 `swarm.code` / 缺口管线。这才是「发现即入群」。

**岗乙 · 用户创作**（Studio 视觉）  
1. 先需求理解确认门。  
2. 用**需求 + 数据类型**判断该账号是否已有冻住流程：需求相关，或该流程本就是处理这类数据且能满足诉求。命中则**提示要不要用**——为方便用户：选用后不再重新理解，与直接打开该固定流程一样只跑解释器。用户从工作流页打开固定流程，MUST NOT 走理解需求。  
3. 检索**内置 Agent** + **该用户自己写过的 Agent**（现有 `kind` / `ownerId` 等标志即可，**禁止另造标志**）。能组合则 Catalog 出配方。  
4. 拼不出才调用写码模型（`swarm.code` / 缺口管线），产出仍落在现有标志上（用户宏 / Scene / pending + `ownerId`）。日后由产品负责人下令，再从这批带标志的 Agent 拆成单能力、进公共蜂群给后来用户复用。

岗乙运行时缺口顺序：

1. 内置 + 该用户已有 Agent 能固定组合 → **配方 / 宏**  
2. 拼不出 → **写码模型**补带现有标志的用户 Agent（宏或 Scene，仍须单能力）  
3. 禁止一条 Scene 吞整条业务链  

禁止：

- 岗甲调用 `swarm.code`；岗乙在运行时改仓库内置  
- 一条新 Agent / Scene 吞整条业务链  
- 手写胖 builtin（跨页 + 版式 + 列映射 + 存表等捆在一起）  
- 为飞书 / 企微 / 邮件等渠道新造跨动词胖 Agent（听+回+发捆一个 builtin）  
- assemble / compose 短路把多步业务藏成目录外的假 Agent  
- 未检索 Catalog 就编造 slug  
- 岗甲发现该抽出 Agent 却把能力藏在 generate / assemble / 宿主代码里，不进蜂群  

Scene 仅经 Dynamic Worker（`LOADER`）执行。

### IV. 配方钉死版本；主 Worker 不 eval

配方步骤钉死 `slug@version`。运行走解释器；主 Worker 禁止 `eval` / `new Function`。

### V. 规格驱动迭代 + 实然必读（Spec Kit）

功能、架构与**热修**都必须先有规格再写代码。默认路径：

`constitution` → `specify` →（可选 `clarify`）→ `plan` →（可选 `checklist` / `analyze`）→ `tasks` → `implement` → `converge`

热修可缩短为：`specify`（标明 hotfix）→ `tasks` → `implement` → `converge`；**不可省略 specify / converge**。

开任何 feature（含热修）前 MUST 阅读：

1. 本 Constitution  
2. `.specify/memory/project-context.md`（**as-is 实现真相**）  
3. 仓库根目录 `CORE.md`（产品应然）  
4. 若含 UI / 体验：`.specify/memory/design-system.md`
5. 若含用户可见文案：遵守双语 i18n（原则 VII / `.cursor/rules/i18n.mdc`）

禁止用过时的 `EVOLUTION.md` 段落否定已落地能力（如 Dynamic Worker、Catalog Vectorize）。

Git 长期分支只有 **`main`（正式）** 与 **`develop`（开发集成）**。功能从 develop 拉 `feat/*`，先合 develop 再合 main 部署；热修从 main 拉 `fix/*`，先合 develop 测过再上正式。单测之后必须用真实账号在浏览器实测。详见 `GIT.md`、`.cursor/rules/git-flow.mdc`。

### VI. 设计约定 + Mobbin 真实体验校验（UI NON-NEGOTIABLE）

视觉与交互 MUST 遵守 `.specify/memory/design-system.md`（现网 token、字体、反模式）。  
凡新增或演进用户可见体验，MUST 使用 **Mobbin MCP** 对照真实产品流程后再落地，并在 plan / PR 留下对照摘要。  
禁止无参考的「AI 默认脸」拼界面。无 UI 的改动可跳过 Mobbin，但须显式说明。

### VII. 双语产品壳（i18n NON-NEGOTIABLE）

初期语言：`zh-CN`（**默认**）与 `en`。  
凡**用户可见**的新功能、改文案、改导航/空态/错误/Agent 展示名：MUST 同步 `messages/zh-CN.json` 与 `messages/en.json`（或既定 Agent 展示 helper），禁止只改硬编码中文。  

- SEO 营销页英前缀 `/en/...`；应用页不加 locale 前缀（Cookie `dw_locale`）。  
- 不翻译：slug、配方、用户表数据。  
- 意图与 Catalog 关键词：中英都能召回。  
细节：`.cursor/rules/i18n.mdc`、`.specify/specs/049-i18n-zh-en/`、`project-context`「语言」。

### VIII. Agent 合格证与流程合格证（NON-NEGOTIABLE）

每个新 Agent（内置 / 宏 / Scene）入 Catalog 或合入仓库前 MUST：

- 一个动词；声明 PortType `input` / `output`
- **进/出夹具**：解释器或 `getBrick().run` 断言输出端口与样例格；覆盖测（`agent-fixture-coverage.test.ts`）缺 slug 即失败；`agent-io-fixtures.test.ts` 每个 slug 一条真实进/出
- 岗甲手写 builtin 同样要交夹具，禁止只改宪法不写测
- 岗乙：静态扫描 + 审核模型通过才注册

每条搭出来的配方 MUST：

- slug 均在 Catalog；上下步端口与列名对得上（`table.pick` 对不上须失败，不得静默丢列）
- 用用户表或金标跑 `runAcceptance`；不过不得当成功、不得固化
- 出图后结果表列键须等于当前 sheet 列
- 固化版本对 fixture 回归通过才能 promote

禁止为赶验收跳过夹具或整链验收。细则：`.cursor/rules/agent-quality-gates.mdc`、`CORE.md` ⑥⑦。

## 产品与技术约束

- 对外文案与注释说 **Agent**；代码目录可保留历史名 `bricks`。  
- 密钥不进配方、不进提示词、不进日志；配方只写 `secret_id`。  
- 出口也是 Agent（导出、HTTP POST 等）。  
- 生产：Cloudflare OpenNext + D1 `FLOW_DB` +（可选）Vectorize；本地可 JSON store。  
- **已落地**：Catalog Brain、缺口写码/审核、Dynamic Worker Scene、验收与 SSE 时间线。  
- **未落地**：R2 待审存储、积木市场、默认绑定推送 Queue（详见 project-context）。  
- **设计**：青绿信号色 + Syne/Figtree/Plex Mono；进化靠 design-system + Mobbin。

## 开发工作流（Spec Kit）

1. 新能力、行为变更或热修：先 `/speckit-specify` 写清 what/why 与验收（热修标明 hotfix）。  
2. `/speckit-plan` 必须对照 `project-context.md`；含 UI 时对照 `design-system.md` 并附 Mobbin 摘要（热修可将短 plan 并入 feature 目录）。  
3. `/speckit-tasks` 产出可勾选任务；UI 任务含 Mobbin 校验项；实现只跟 `tasks.md`。  
4. `/speckit-implement` 按依赖顺序落地；完成后 `/speckit-converge`。  
5. **热修也走 Spec**；仅允许缩短路径，禁止「口头热修直接改代码」。  
6. 改 as-is 架构 → 更新 `project-context.md`；改视觉 token / 体验原则 → 更新 `design-system.md`。  
7. 改用户可见文案 / 新 UI → 同步 `messages/zh-CN.json` + `en.json`（或 Agent 展示 helper）。  
8. **Git**：功能在 `feat/*` 上做完 → 合 `develop`（单测 + 账号实测）→ 再合 `main` 部署；热修在 `fix/*` → 合 `develop` 测 → 合 `main` 上正式后再测。禁止默认在仓库根开 `001-…` 序号分支，禁止功能直接打 `main`。

## Governance

- 冲突优先级：**代码 ≈ project-context > design-system（视觉）> CORE（原则）> Constitution（过程）> EVOLUTION（历史）**。  
- 修订 Constitution 须更新 Version / Last Amended，并附 Sync Impact Report（HTML 注释）。  
- PR / Agent 实现须能指回对应 feature 的 `spec.md` 与 `tasks.md`（若适用）。

**Version**: 1.10.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-14
