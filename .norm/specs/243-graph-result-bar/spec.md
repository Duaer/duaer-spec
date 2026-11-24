# Brief: Restore dispatch graph + result bar at bottom

## Symptom

1. 调度中心 shows「No dispatch graph yet」even when the project has a task pool
   (graph used to render).
2. Result bar（结果 · 初版 / 监听中 / 打开看看 / 部署 / 打开目录 / 再改一版）
   sits too high in the middle column; should sit at the bottom.

## Cause

1. Wrap layout (max 4 cols) places wrap edges right→left across the stage;
   Archify clean-flow validation rejects them → `/api/architecture/render`
   400 → dispatch-center `showEmpty()`.
2. `#previewPanel` lives mid-`#dispatch` and focus scrolls it to the top of
   the card column viewport.

## Acceptance

1. Dispatch center renders a graph for projects with `taskPool.tasks` (snake
   wrap: odd bands reverse so wrap edges stay same-column / vertical)
2. Live jev (or similar) chat IR passes `/api/architecture/render`
3. Result bar is the last block in the middle column (below revise), sticky
   to the column bottom when scrolling
4. `npm test` task-graph + live wire checks pass; restart :8787
