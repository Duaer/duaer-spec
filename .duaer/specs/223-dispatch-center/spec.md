# 223 — Dispatch center

## Goal

Open a project's dispatch graph from a top control, not from hidden hint text.

## Why

The line「与系统架构图同一排版…点击图可新页面全屏查看」is not visible on the desk. The graph needs a button and a place that stays on screen.

## Acceptance

1. The top bar has「调度中心」. Opening it hides the three-column desk and shows a two-pane view.
2. The left pane is 100px wide and lists current projects. Selecting one shows that project's dispatch graph on the right.
3. The dispatch card no longer shows that hint. A「查看派工图」button opens the center on the current project.
4. A project with no confirmed tasks shows a short empty line, not the graph.
