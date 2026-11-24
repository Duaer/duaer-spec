# Brief: Duaer brand in desk setup copy (site-wide)

## Goal

User-facing live-desk copy that names the product surface must include the
**Duaer** brand (not anonymous「台面」alone). Persist this as an always-on
agent rule for the whole desk.

## In scope

- `setup.hint` and related setup guide strings that say「台面模型」/ desk model
- Agent rules: `.cursor/rules/ai-ui-copy.mdc`, `.claude/rules/ai-ui-copy.md`,
  `AGENTS.md` AI-Generated Page Content
- Brand contract test + E2E note

## Out of scope

- Renaming every occurrence of「台面」in technical docs
- Logo / CSS redesign

## Acceptance

1. zh `setup.hint` includes `Duaer`; en equivalent includes `Duaer`
2. Setup guide desk title / lead name Duaer where they describe the desk model
3. Always-on rule: visible desk UI copy that identifies the product must say
   Duaer (or Duaer-spec FED where already branded)
4. `npm test` brand suite still passes
