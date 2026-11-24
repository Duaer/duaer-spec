# Agent workflow (Norm)

Authoritative docs for *how* digital employees operate (workplace policy).
Wins over Norm and `examples/` when they conflict.

| Doc | Description |
|---|---|
| [live-desk.md](live-desk.md) | FDE desk: modules, late kickoff, task pool, workers |
| [worker-models.md](worker-models.md) | Worker CLIs vs desk LLM; Claude Code + other models |
| [worker-models.zh-CN.md](worker-models.zh-CN.md) | 数字员工 CLI 与其它模型（中文） |
| [workflow.md](workflow.md) | Rules R1–R6, development loop, spec guidance |
| [branching-and-release.md](branching-and-release.md) | **Required** `main`/`develop`/`feat`/`fix` + go-live by issue type |
| [deploy-targets.md](deploy-targets.md) | Planned host: Cloudflare / Alibaba Cloud / AWS / GitHub Pages |
| [deploy-github.md](deploy-github.md) | Default product hosting via `gh` + GitHub Actions |
| [change-checklist.md](change-checklist.md) | Finish checklist |
| [e2e-test-plan.md](e2e-test-plan.md) | E2E scenario catalog template |
| [../adr/001-verification-gate.md](../adr/001-verification-gate.md) | Risk-based verification gate (ADR) |

Root contracts: [`AGENTS.md`](../../AGENTS.md), [`.norm/memory/testing.md`](../../.norm/memory/testing.md).  
Adoption: [`ADOPT.md`](../../ADOPT.md) — `npx @fujiezee/norm init --here` / `npx @fujiezee/norm update`.  
Chinese summary: [`README.zh-CN.md`](../../README.zh-CN.md).
