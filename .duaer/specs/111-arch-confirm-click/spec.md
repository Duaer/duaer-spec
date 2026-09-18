# Brief: Architecture confirm button stays clickable

## Symptom

After the diagram renders under Planned hosting,「确认架构」appears but
cannot be clicked (stays disabled).

## Cause

`syncArchitecturePanel` runs while `state.busy` is still true during render,
so the button is disabled. `setBusy(false)` does not re-sync the panel.

## Acceptance

1. When architecture status is `preview` with a URL and not confirmed, the
   confirm button is enabled after the chat request finishes (busy clears).
2. Button stays disabled while a chat request is in flight.
3. Click still confirms architecture and unlocks dispatch.
