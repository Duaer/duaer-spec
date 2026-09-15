# Source

**Brand:** [duaer-spec](https://github.com/fujiezee/duaer-spec)

## MyDesk (PI-Desktop) — agent ops (authoritative)

| Item | Upstream | Copied |
|---|---|---|
| Agent rules | `AGENTS.md` | yes → root |
| AI development workflow | `docs/spec/06-delivery/03-ai-development-workflow.md` | yes → `docs/agent/workflow.md` |
| Change checklist | `docs/spec/06-delivery/05-change-checklist.md` | yes → `docs/agent/change-checklist.md` |
| Product baseline / ADR / E2E catalog | `docs/spec/**`, `docs/adr/**` | no (product-specific) |

Upstream at extract: `/Users/morgan/digital-employees/MyDesk` · 2026-09-15

## Spec Kit (DianWu Flow + GitHub)

| Item | Upstream | Copied |
|---|---|---|
| Spec Kit scaffold | `DianWuFlow/.specify/` | yes → `kit/.specify/` |
| Cursor skills | `DianWuFlow/.cursor/skills/speckit-*` | yes → `kit/.cursor/skills/` |
| Spec Kit rule / SPECKIT | generalized from DianWu Flow | yes → `kit/` |
| Feature specs / product memory | `DianWuFlow/.specify/specs/**`, design-system, … | **no** |
| DianWu Flow examples | SPECKIT.md, constitution, testing, spec-kit.mdc | yes → `examples/dianwu-flow/` |
| Official Spec Kit | https://github.com/github/spec-kit | snapshot → `vendor/github-spec-kit/` |

Upstream DianWu Flow: `/Users/morgan/digital-employees/DianWuFlow` · 2026-09-15

## Precedence

If Spec Kit, examples, or a product overlay conflict with MyDesk agent ops in this repo, follow root `AGENTS.md` / `docs/agent/`.
