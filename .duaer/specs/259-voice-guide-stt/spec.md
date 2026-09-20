# Fix: Record without STT opens Settings

## Goal

Clicking Record with no speech model configured guides the operator to Settings
instead of falling back to browser speech.

## Acceptance

1. If `sttReady` is false, Record shows a short bot notice and opens Settings
   (speech model block).
2. Recording / transcribe only runs when STT is configured.
3. L0 + L3 smoke still pass.
