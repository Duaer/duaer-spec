# Feature Specification: Settings always closable + denser desk

## Goal

Settings drawer must close via 关闭 / backdrop / gear toggle / Escape even when
the model is not configured. Make drawers and shell denser.

## Cause

Close handlers gated on `state.ready`; gear toggle only closes when ready.
Escape did not dismiss drawers.

## Acceptance

1. Settings closes without `state.ready` (button, backdrop, gear, Escape).
2. Drawers and shell spacing tighter than pre-fix.
3. Targeted tests pass.
