# 160 — Result bar Deploy button

## Goal

After a satisfactory preview, operators can click **Deploy** next to
「打开看看」to publish. Planned-host chips stay where they are. If the
choice is still「暂不部署」, Deploy defaults to **GitHub Pages**.

## Acceptance

1. Preview actions include a Deploy button when the result panel is visible
2. Click Deploy with target `none` → effective target becomes `github-pages`
3. `POST /api/deploy` launches the digital employee with a deploy prompt
   (push/`gh` authorized for that publish)
4. Desk shows a bot line and resumes status poll; L0 tests cover the wiring
