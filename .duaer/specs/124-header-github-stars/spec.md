# Feature Specification: Uniform header actions + GitHub stars

## Intent

Make the top-right header controls the same visual style, and add a GitHub
project button that opens the repo and shows a live star count.

## Why

Header actions (Projects / Settings / language) should read as one control set.
Users need a clear path to the open-source project with social proof (stars).

## In scope

- Unify top-right control chrome (same height, border, type, hover/focus)
- Add GitHub control linking to `https://github.com/fujiezee/duaer-spec`
- Show star count refreshed from GitHub (cached server proxy preferred)
- i18n labels; E2E + smoke markers

## Out of scope

- Star-on-click (GitHub login) — link opens the repo; stars are display-only
- Changing project badge into a button
- Other social networks

## Acceptance

1. 项目 / 设置 / 语言 / GitHub look like the same button family
2. GitHub control opens the duaer-spec repo in a new tab
3. Star count appears when GitHub API is reachable (or a calm fallback without fake numbers)
4. `npm run test:live` passes; E2E catalog updated
