# Feature Specification: Keep modules clickable during bug + theme leftovers

## Goal

After「改缺陷」, prior requirement module tabs must stay visible and clickable
(view). Fix remaining light-theme dark overlays that still look wrong.

## Cause

`enterDeskKind("bug")` / `beginBugFixFromCta` replaced `state.modules` with a
single bug card, and `renderModuleTabs` hid tabs when `deskKind === "bug"`.

## In scope

- Preserve feature modules; append/select a `bug` module instead of wiping
- Show module tabs in bug mode; feature tabs viewable (readonly when confirmed)
- Theme: replace leftover `rgba(8,14,20,…)` wells with tokens
- Docs + tests

## Acceptance

1. After starting a defect from a multi-module feature project, prior module
   tabs remain and switching shows that module's card (readonly if confirmed).
2. Bug module is editable; confirming the defect does not delete feature modules.
3. Light theme no longer uses fixed near-black overlay fills on wells.
4. Targeted tests pass.
