# Feature Specification: Hide product/revise CTAs until accepted

**Feature Branch**: `fix/progress-cta`

**Created**: 2026-09-16

**Status**: Active

## Goal

While progress shows in-progress (e.g. `0/3 · 进行中`), do not show 查看成品
or 再改一版 / 改进卡. Those appear only after delivery accepted.

## Acceptance

1. Status `dispatched` with open delivery → preview null, canRevise false
2. Status accepted → preview + revise CTA available
3. During revising round → preview may stay; revise panel as needed
