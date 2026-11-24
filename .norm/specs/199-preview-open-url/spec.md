# 199 — 打开看看 opens the focused preview URL

## Goal

Result-bar「打开看看」(and the same open path) must open the **currently
focused** preview URL (`state.lastPreviewUrl`), not always re-resolve the
latest delivery preview (which can be a different revision or a docs path).

## Acceptance

1. `/api/artifact|result/…` and other same-origin paths open directly.
2. Public https URLs open directly.
3. Local `http://localhost:…` still goes through `/api/preview/ensure`, then
   opens the focused URL when set.
4. Chat「打开看看」href stays a same-origin `/api/…` path (not a baked host).
5. L0/L1/L3; merge develop.
