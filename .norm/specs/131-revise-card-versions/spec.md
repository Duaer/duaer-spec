# 131 — Versioned revise cards (改进卡)

## Goal

Each iteration keeps its own 改进卡 with a version number. Finishing revision N
opens/edits revision N+1; prior cards are never overwritten.

## In scope

- Persist `reviseCards[]` (one entry per dispatched revision) in project chat
- Title shows `改进卡 · 第 N 版` for the focused revision
- Version chips to browse prior cards (readonly) and the current draft
- `再改一版` advances to the next revision number with a fresh empty card
- Migrate legacy `lastRevision` + single `reviseCard` into the version list

## Out of scope

- Changing how Terminal / agent revision prompts are built
- Result panel preview version chips (already versioned)

## Acceptance

1. After dispatch of revision 1, the locked card shows version 1 and keeps its fields
2. Clicking 再改一版 shows version 2 with empty fields; version 1 remains browsable
3. Switching chips restores each version’s fields without wiping others
4. Reload restores the full reviseCards history
5. L0 + project-chat unit + `npm run test:live` pass; E2E catalog updated
