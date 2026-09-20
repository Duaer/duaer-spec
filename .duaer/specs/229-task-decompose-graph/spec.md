# 229 — Task decompose → recommend workers → dispatch graph

## Goal

After architecture confirm (and on revise re-confirm), decompose atomic tasks with parallel marks, recommend 1–4 digital employees, and generate the dispatch graph only after the operator confirms the count.

## Acceptance

1. Dispatch panel appears only after architecture is confirmed.
2. Atomic task list is visible above Digital employees; parallelizable tasks are marked.
3. System recommends worker count (1–4) from parallel width; user can change it.
4. Confirm count generates the dispatch graph; graph is gated until then.
5. Revise path uses the same gate after architecture re-confirm.
6. Docs/E2E/i18n/tests updated; risk verification passes.
