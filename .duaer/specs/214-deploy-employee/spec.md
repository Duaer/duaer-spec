# Spec: Deploy digital employee + docs for hosting options

## Goal

Add a **Deploy** digital employee to the desk catalog (role `deploy`), tag
deploy tasks with that role, and document supported hosting options in
READMEs (and live-desk) in plain product copy — no meta「人话」label.

## In scope

- Catalog + i18n (zh/en/ja) for deployer
- `buildTaskPoolFromModules` deploy task → `role: deploy`
- Multi-worker: deploy tasks on last lane (with verify-l3) when N≥2
- README.zh-CN / README.md: deploy employee + supported methods list
- live-desk.md + CHANGELOG + tests

## Acceptance

- [ ] Employee directory shows 部署员工 / Deployer
- [ ] Deploy pool tasks use `{deploy}`; docs list Cloudflare / 阿里云 / AWS / GitHub Pages / 暂不部署
- [ ] npm test passes
