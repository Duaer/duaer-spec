# Fix: confirm button state chaotic

## Symptom

Requirement confirm button enable/label/hint feels wrong or flickery after
modular modules landed — especially when switching module tabs, during/after
chat busy, or after confirming one of several modules.

## Cause

1. `syncConfirmEnabled()` rebuilt module tabs on every validate/input tick
2. Tab switch did not re-run validate for the new module card
3. `setBusy(false)` latched `disabled` via `busy || el.disabled` without recompute
4. Restore could keep `locked` out of sync with per-module status

## Acceptance

1. Typing in the confirm card does not rebuild module tabs
2. Switching to an unconfirmed module with filled fields schedules validate and can enable Confirm when passed
3. After confirming one module, focus moves to the next draft (if any); button label/hint match active module
4. Clearing busy re-enables Confirm when rules allow
5. L0 + `npm test` / `npm run test:live` for touched markers; E2E catalog row
