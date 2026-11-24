# Fix: deliverables page content structure

## Goal

Customer-facing deliverables HTML structures long acceptance / out-of-scope /
task-pool text into readable lists, chips, tables, and module cards — not
wall-of-text paragraphs.

## Acceptance

1. Inline numbered acceptance (`1)…；2)…`) renders as ordered lists
2. Short comma /顿号 out-of-scope lists render as chips
3. Task pool markdown renders as a checklist table
4. Requirements confirmation is a registry table (no duplicate full cards)
5. Architecture arrow summaries render as flow steps
6. Unit tests cover splitters + HTML markers
