# Feature Specification: Deploy target choice + fine tasks + self-update bootstrap

**Feature Branch**: `feat/deploy-target-tasks`
**Brief**: `.duaer/specs/089-deploy-target-tasks/`
**Status**: Accepted

## Goal

1. Global CLI users on old builds can upgrade: `self-update` works on current
   package; banners tell people to run `npm i -g duaer-spec@latest` when the
   installed CLI lacks the command.
2. On live dispatch, choose planned hosting: Cloudflare / 阿里云 / AWS /
   GitHub Pages / none. Code and agent prompts follow that platform’s rules
   (Cloudflare: Workers/Pages constraints documented).
3. Drop hard task-count caps (no max 12). Split into single-function,
   independently acceptable tasks; do not couple acceptance into one mega-task.

## Acceptance

1. `duaer self-update` / `upgrade` run npm global install; unknown-command and
   update hints show `npm i -g duaer-spec@latest` bootstrap
2. Dispatch UI has deploy-target control; `/api/dispatch` persists target;
   agent prompt + Spec notes reference the chosen platform doc
3. Cloudflare choice adds Workers/Pages coding constraints in prompt +
   `docs/agent/deploy-targets.md`
4. `buildDetailedProductTasksMd` / revision builders do not slice acceptance
   to 6/4; prompts say split finely with no upper count
5. Tests + E2E + CHANGELOG; `npm test` + `npm run test:live` pass
