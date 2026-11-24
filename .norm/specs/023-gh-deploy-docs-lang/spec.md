# Feature Specification: GitHub CLI deploy + English docs language

**Feature Branch**: `feat/gh-deploy`

**Created**: 2026-09-16

**Status**: Accepted

## Goal

When a product job needs hosting/deploy, digital employees use **GitHub CLI
(`gh`) + GitHub Actions** as the default automation path (not third-party
host CLIs). English documentation must not contain Chinese characters;
Chinese docs may include English terms.

## In scope

- Live dispatch: detect deploy need from Brief text; add tasks + agent prompt
  rules for `gh` / Actions / Pages
- Template workflow adopters/agents can copy
- Agent-ops + README (EN/ZH) document the policy
- Scrub Chinese from English tracked docs (`README.md`, `CHANGELOG.md`,
  `docs/agent/*`, etc.)

## Out of scope

- Rewriting Chinese Live Dev UI copy to English
- Non-GitHub cloud vendors as first-class defaults
- Auto-push without an explicit deploy/ship ask in the job

## Acceptance

1. Deploy-needed live jobs get an extra task and prompt block pointing to
   `gh` + Actions (Pages template available under `.duaer/templates/`)
2. `docs/agent/deploy-github.md` exists (English only) and is linked from
   branching/README
3. English docs contain no CJK characters
4. Chinese README documents the same deploy preference (may use English
   tool names)
5. E2E catalog lists the deploy policy scenario

## Assumptions

- “Needs deploy” includes 部署 / host / publish / Pages / go online for a
  user-facing site or app artifact
- User asking for a deployable site authorizes `gh` setup and the push
  required to publish that deployment
