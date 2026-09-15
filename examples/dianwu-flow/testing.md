# 点物 Flow · 完整测试约定

> Duaer / Agent 做验收与质量门禁时必读。  
> 目标：**层叠测全**——单测 → 产品验收 → Live/Smoke → **Playwright E2E** → UI/Mobbin → 专家审阅。

---

## 1. 测试金字塔（本仓库）

| 层 | 有什么 | 怎么跑 | 谁负责 |
| --- | --- | --- | --- |
| **L0 静态** | ESLint、`tsc` | `npm run lint`；`npx tsc --noEmit` | 每次实现后 |
| **L1 单测** | `src/**/*.test.ts`（node:test + tsx）；流程级场景库 `fixtures/user-scenarios/` | `npm test`（含 `agent-fixture-coverage`、`agent-io-fixtures`、银行金标、用户场景 replay/compose） | 默认 / 实现后；**新 Agent 缺夹具即失败**；新拼装事故先加场景 |
| **L2 产品验收** | `src/lib/acceptance/*` | 含在 `npm test`；生成路径内 `runAcceptance` | 核心路径改动 |
| **L3 Live LLM** | 真模型缺口流水线 | `npm run test:live:gap`（`LIVE_LLM=1`） | 改 gap / 模型路由 |
| **L4 Smoke 脚本** | `scripts/smoke-*.mts`、`call-generate-*.mts` | `npm run smoke:gap` 等 | 发版前 / 生成大改 |
| **L5 Playwright E2E** | `e2e/*.spec.ts` + GitHub Actions | `npm run test:e2e`（壳层）；`test:e2e:generate`（真生成，需 `E2E_GENERATE=1`） | 改 Studio / 壳层 UI；CI 跑壳层 |
| **L5b 体验对照** | Browser MCP + **Mobbin** | Agent 探索 + 设计约定 | 大改体验时 |
| **L6 专家审阅** | Bugbot / Security / Duaer checklist·analyze·converge | 见 §3 | Feature 合并前 |

一键本地门禁：`npm run test:full`（单测 + tsc + E2E 壳层）。  
**核心功能验收**：`npm run test:core` + 清单 [.duaer/memory/core-acceptance.md](core-acceptance.md)。

### i18n 门禁（用户可见改动）

触及 UI 文案 / messages / Agent 展示 / SEO locale 时，合并前 MUST：

1. `messages/zh-CN.json` 与 `messages/en.json` key 对齐（`src/lib/i18n/i18n.test.ts`）
2. 新用户可见字符串走 `t()` / `localizeAgentName` 等，禁止只改硬编码中文
3. 相关子集：`npx tsx --test src/lib/i18n/i18n.test.ts src/lib/bricks/agent-display.test.ts`

硬约束见 `.cursor/rules/i18n.mdc`、Constitution VII。

---

## 2. 「完整测试」最低清单（Definition of Done）

对触及 CORE 路径（编排 / Catalog Brain / 缺口 / 验收 / Dynamic Worker / Studio）的变更，合入 **develop** 前 MUST：

1. [ ] `npm test`（或相关子集 + acceptance）通过  
2. [ ] `npx tsc --noEmit` 无错  
3. [ ] **真实登录账号**在浏览器走改动主路径（及空态/报错等边上）；禁止只靠单测宣称完成  
4. [ ] 若改 UI / Studio：**`npm run test:e2e`** 通过；大改体验另加 Mobbin 摘要  
5. [ ] 若改缺口/模型：`test:live:gap` 或等价 smoke 至少一条  
6. [ ] Duaer：`checklist` / `analyze` / `converge`（热修至少有 `spec.md` + `converge`）  
7. [ ] `/duaer-converge` 无未关闭缺口  
8. [ ] 专家：Bugbot（或等价）；涉密钥/推送/LOADER → Security Review  

合 **main** 部署后：再用账号看正式环境一眼。  

热修仍须走 Spec（可缩短路径）；测试层可按 spec/tasks 缩减，但 **用户可见路径的账号实测不能省**。

---

## 3. Playwright（L5）说明

| 文件 | 作用 |
| --- | --- |
| `playwright.config.ts` | Chromium；无 `PLAYWRIGHT_BASE_URL` 时自动 `npm run dev` |
| `e2e/studio-shell.spec.ts` | 首页品牌、demo 载入、定价页（**CI 默认**） |
| `e2e/studio-generate.spec.ts` | 真点「立即转换」（可选，`E2E_GENERATE=1`） |

选择器优先 `data-testid`（`studio-hero` / `demo-chip-sales` / `studio-prompt` / `studio-generate`）。

```bash
npm run test:e2e              # 壳层冒烟
npm run test:e2e:ui           # Playwright UI 模式
E2E_GENERATE=1 npm run test:e2e:generate
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e  # 复用已起的 dev
```

CI：`.github/workflows/e2e.yml` 在 push/PR 跑 `npm test` + `npx tsc --noEmit`（unit job）以及 `test:e2e`（playwright job）。

---

## 4. 专家能力与插件

### Duaer

| 命令 | 测什么 |
| --- | --- |
| `/duaer-checklist` | 需求可测性 |
| `/duaer-analyze` | spec/plan/tasks 一致性 |
| `/duaer-converge` | 代码是否覆盖规格 |

### Cursor

| 能力 | 用法 |
| --- | --- |
| Bugbot / Security Review | Task 子代理 |
| Browser MCP | 探索性 UI（补 Playwright 未覆盖路径） |
| Mobbin | 真实产品体验对照 |

### 云效 Yunxiao

用例库 / 测试计划（可选跟踪）；**不替代** `npm test` / `test:e2e`。

### 产品内验收

生成流水线 `acceptance` = 业务完成态。

---

## 5. 推荐完整一轮

```
1. npm test
2. npx tsc --noEmit
3. npm run test:e2e
4. （可选）test:live:gap / smoke:* / E2E_GENERATE=1
5. /duaer-converge
6. Bugbot
7. 涉安全 → Security Review
```

或：`npm run test:full` 覆盖 1–3。

---

## 6. Duaer 挂钩

| 阶段 | 测试动作 |
| --- | --- |
| `specify` | Independent Test + 验收标准 |
| `plan` | Testing 栏写明 L1–L6 |
| `tasks` | 默认要求测试任务；UI 含 `test:e2e` |
| `implement` | 改完跑相关测 |
| `converge` | 对照 §2 |

---

## 7. 进化记录

| 日期 | 变更 |
| --- | --- |
| 2026-09-04 | 初版 |
| 2026-09-04 | **补 L5 Playwright** + CI workflow + `test:full` |
| 2026-09-04 | **核心路径验收**：`core-path.test.ts` + `test:core` + core-acceptance 清单 |
