# Feature Specification: Fix queuedCount ReferenceError

**Feature Branch**: `fix/queued-count`  
**Brief**: `.duaer/specs/063-queued-count/`  
**Status**: Active

## Goal
Fresh Terminal open path must not throw `queuedCount is not defined`.

## Acceptance
1. Unhealthy-runner launch return uses a defined queue depth
2. `npm test` passes
