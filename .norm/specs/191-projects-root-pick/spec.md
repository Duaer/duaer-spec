# 191 — Pick projects parent folder (no typing)

## Goal

Operators choose the **产品父目录** via the system folder dialog, not by
typing a path. Selection saves immediately.

## Acceptance

1. Projects drawer shows parent path as read-only display (not a free-text field).
2. A **选择…** control opens the native folder picker and saves `projectsRoot`.
3. Cancel leaves the previous value unchanged.
4. Optional clear control empties `projectsRoot`.
5. L0 + smoke/unit markers + merge to develop.
