# 198 — Task graph: no redundant Archify labels

## Goal

Kickoff task-path Archify diagram shows nodes and edges only — no
redundant edge/legend/subtitle copy (e.g. repeated "depends").

## Acceptance

1. Connections have no `label`.
2. No legend `cards`; no meta `subtitle`.
3. Unit tests assert label-free IR; L0/L1/L3; merge develop.
