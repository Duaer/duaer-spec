# Feature Specification: Persist validate gate with desk session

**Feature Branch**: `fix/validate-persist`  
**Brief**: `.duaer/specs/097-validate-persist/`  
**Status**: Accepted

## Goal

After refresh, if the requirements card was already auto-validated
(passed), the Confirm button stays enabled — do not force a silent
idle gate that blocks Confirm.

## Why

096 restored card text and jobId, but `state.validate` reset to idle.
Confirm requires `validationAllowsSend` (passed + matching fingerprint),
so users see a filled card that “already passed” but cannot click Confirm.

## Acceptance

1. Passing auto-validate is saved in the project session file
2. Refresh with unchanged card restores passed gate → Confirm clickable
3. Editing the card after restore invalidates / re-validates as today
4. `npm test` + `npm run test:live` pass
