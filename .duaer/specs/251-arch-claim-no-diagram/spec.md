# Fix: architecture chat must not claim diagram ready without render

## Symptom

Left chat shows「架构图已生成」(or equivalent) while the middle「系统架构」
panel has no diagram. Users think the desk failed silently.

## Cause

The model is prompted to say “diagram ready” in prose while putting IR after
`<<<JSON>>>`. When IR is missing or fails to render, the desk already shows a
missing hint, but the **original bubble still claims success**.

## Acceptance

1. If architecture chat claims ready but no `architectureUrl` / renderable IR,
   the **same** assistant bubble is rewritten to the missing-diagram copy (no
   leftover “已生成” text).
2. That bubble offers「重新生成架构图」; middle panel uses `missing` hint.
3. Continue chips are not shown as if a diagram already exists when there is
   no render URL / no components.
4. E2E catalog row + L0/L1/L3 smoke markers updated.
5. English docs stay CJK-free.
