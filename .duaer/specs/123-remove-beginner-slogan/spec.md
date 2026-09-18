# Feature Specification: Remove beginner slogan

## Intent

Remove the visible slogan 「小白也能做FED」 / 「Beginners can do FED too」 from Duaer-spec FED.

## Why

Product copy decision: that line is no longer wanted.

## In scope

- Remove header center beginner line (`top-beginner` / `header.beginner`)
- Remove leftover unused `chat.emptyTitle` slogan strings
- Drop related CSS / smoke / E2E expectations

## Out of scope

- Other brand copy (Duaer-spec FED, flow-line, empty steps)
- Layout redesign beyond removing the slogan slot

## Acceptance

1. Hard refresh: top nav has no beginner slogan (zh or en)
2. `header.beginner` / `chat.emptyTitle` slogan keys gone from i18n
3. Smoke + E2E catalog updated; `npm run test:live` passes
