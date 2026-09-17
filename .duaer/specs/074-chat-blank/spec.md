# Feature Specification: Fix .mjs MIME so desk JS loads

**Feature Branch**: `fix/chat-blank`  
**Brief**: `.duaer/specs/074-chat-blank/`  
**Status**: Active

## Goal

Live desk ES modules load in the browser. Chat / desk UI works again.

## Problem

`web/live-dev/app.js` imports `structured-html.mjs`. Static serve mapped
unknown extensions to `application/octet-stream`. Browsers reject module
scripts with that MIME, so `app.js` never runs: desk stays hidden, chat
shows nothing after “send”.

## Acceptance

1. `GET /structured-html.mjs` returns `content-type: text/javascript`
2. Headless load: desk unhides; send produces visible `.bubble` nodes
3. `npm test` + `npm run test:live` pass
