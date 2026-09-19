# 196 — Worker chips + task dependency execution graph

## Goal

Improve the digital-employee count control (chips instead of a bare select),
and show a **task path dependency graph** (architecture-panel look) driven by
module/task `dependsOn` and the selected worker count.

## Acceptance

1. Worker count is a chip radiogroup (1–4); selected state matches deploy chips.
2. When the task pool is visible, an SVG dependency graph shows tasks, edges,
   and worker lane coloring for the current count.
3. Changing worker count re-assigns and re-renders the graph.
4. Unit tests for layout/render; L3 smoke; merge develop.
