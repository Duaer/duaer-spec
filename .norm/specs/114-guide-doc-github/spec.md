# Brief: Setup guide doc links to GitHub (locale-specific)

## Goal

Replace local path hints like `docs/agent/worker-models.zh-CN.md` with
direct GitHub blob links. Chinese UI → zh-CN doc; English UI → EN doc.

## Acceptance

1. zh `setup.guideDoc` links to
   `https://github.com/fujiezee/duaer-spec/blob/main/docs/agent/worker-models.zh-CN.md`
2. en `setup.guideDoc` links to
   `https://github.com/fujiezee/duaer-spec/blob/main/docs/agent/worker-models.md`
3. Links open in a new tab; no bare relative repo path as the only pointer
4. Locale switch updates the link
