# Feature Specification: Drop the former-name note from the intro site

## Goal

The intro site no longer shows that Norm was formerly duaer-spec (user ask, 2026-11-24).

## Scope

- `site/index.html`: remove the rename note in `#install` and its now-unused `.note` style.
- Out of scope: README / ADOPT / CHANGELOG / ADR keep the rename and upgrade notes for existing installs.

## Acceptance

1. `site/index.html` contains no `duaer` text.
2. No unused `.note` CSS remains; the page otherwise renders as before.
3. `npm test` passes.
