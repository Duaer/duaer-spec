# Feature Specification: Fix result bar buttons + follow latest version

## Intent

1. Result-bar buttons stay horizontal (no vertical glyph wrap).
2. Heading「结果 · 第 N 版」and current-version mark always follow the latest
   accepted/revise result.

## Acceptance

1. 打开看看 / 打开目录 / 再改一版 are single-line horizontal buttons
2. After a new revision, heading and current chip move to that revision
3. Cache-bust assets; `npm run test:live` passes
