# 161 — Deploy target picker on Deploy click

## Goal

Clicking「部署」opens a dialog:「要部署到哪里？」with concrete hosts
(Cloudflare / 阿里云 / AWS / GitHub Pages). Confirm starts deploy.

## Acceptance

1. Deploy click opens picker (not silent default)
2. Options exclude「暂不部署」; preselect current host or GitHub Pages
3. Confirm runs existing `/api/deploy` with chosen target
4. Cancel closes without deploy; L0 wiring tests pass
