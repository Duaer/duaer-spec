# Feature Specification: Revise card below confirm card

**Feature Branch**: `fix/revise-card-below`

**Created**: 2026-09-16

**Status**: Active

## Goal

Keep the top confirm card unchanged. Put the revise card in the bottom panel
so users can read it under the dialogue flow without the top card becoming 改进卡.

## Acceptance

1. Confirm card title/labels/styles never switch to revise chrome
2. Revise fields render in `#revisePanel` below preview
3. Chat applyCard updates bottom revise fields in revise mode
4. After revise lock, top still shows original requirements
