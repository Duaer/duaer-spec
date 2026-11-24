# 143 — Upgrade embed CSS so passport popup reaches cached HTML

## Goal

Serving previously rendered architecture HTML must apply the focus-chip
restore, not keep the old `#duaer-embed-fit` block forever.

## Acceptance

1. `injectDuaerEmbedFitCss` replaces an existing fit style block
2. Served `?embed=1` HTML includes `.focus-chip { display:block }`
3. Unit + live smoke pass
