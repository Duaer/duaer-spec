# 197 — Task graph via Archify (same as architecture)

## Goal

Task execution path uses the **same Archify renderer and left-to-right layered
layout** as the system architecture diagram — not a custom SVG.

## Acceptance

1. Kickoff task graph is produced via `/api/architecture/render` +
   `mountArchitectureDiagram`.
2. IR maps tasks → components, `dependsOn` → connections; layout matches Archify.
3. Changing worker count re-renders the Archify graph.
4. Unit tests for IR mapping; L3 smoke; merge develop.
