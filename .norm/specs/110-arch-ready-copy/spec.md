# Brief: Architecture ready copy points to rendered diagram

## Goal

When the diagram is ready, chat must not ask users to confirm JSON. Say the
diagram is shown under planned hosting and invite confirm there.

## Acceptance

1. Prompt: ready reply text never mentions JSON to the user
2. After successful render, chat bubble uses arch.renderedReady
3. Panel hint matches
