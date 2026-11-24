# 231 — Fix dispatch graph Archify spacing

## Goal

「确认人数并生成派工图」must actually produce a viewable graph. Archify was rejecting task IRs because edges were shorter than 24px after label-driven component growth.

## Acceptance

1. Task-pool IR uses spacing that keeps Archify edge length ≥ 24px for real multi-task pools.
2. Render failures show in chat (not only a fleeting button flash).
3. Confirm succeeds against the live mypro session task pool; graph view enables.
4. Tests cover spacing / render success; merge to develop.
