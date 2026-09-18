# 186 — Requirements card click-edit must not wipe content

## Goal

Clicking a requirements field to edit, then leaving without changes, must keep the original field text.

## Symptom / cause

`exitReqEdit` commits editor → rebuilds view HTML (removes `.req-item-input`) → `onReqEditorChanged` commits again with zero inputs → `serializeReqEdit` writes `""`.

## Acceptance

1. Exit edit with no changes leaves textarea value unchanged.
2. `commitReqEditorToTextarea` no-ops when the view is not in editor DOM.
3. Typing while editing still persists to the hidden textarea.
4. L0 + L1/L3 smoke pass.
