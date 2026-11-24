# Fix: projects parent folder picker unusable

## Symptom

Clicking 产品父目录 / 选择… does not yield a usable folder choice (dialog
behind other windows, or readonly field ignores clicks).

## Cause

`pickFolderNative` uses `osascript choose folder` without activating a UI
app, so the dialog often stays behind the browser. The path field is
readonly with no click handler.

## Acceptance

1. Clicking **选择…** or the readonly parent path opens a frontmost macOS
   folder dialog (Finder-activated).
2. Pick is async (HTTP event loop not blocked by spawnSync).
3. Cancel leaves previous `projectsRoot` unchanged.
4. Unit markers + L0 check.
