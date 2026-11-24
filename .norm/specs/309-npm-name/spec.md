# Feature Specification: npm package name @fujiezee/norm

## Symptom

`npm publish` of 0.27.11 failed: `403 Package name too similar to existing package unorm` for `ainorm`.

## Decision (user)

Publish as `@fujiezee/norm`. CLI stays `norm`.

## Acceptance

1. `package.json` name is `@fujiezee/norm`; the only bin is `norm` (no `ainorm`, `duaer`, `duaer-spec`: the last two clash with a global `duaer-spec` install).
2. Every install / update / self-update command, the npm registry check, and npm links use `@fujiezee/norm`.
3. README, ADR-004 and CHANGELOG say how to move a global install: `npm rm -g duaer-spec && npm i -g @fujiezee/norm`.
4. `npm test` and `npm run test:live` pass; `npm pack --dry-run` reports `@fujiezee/norm`.
