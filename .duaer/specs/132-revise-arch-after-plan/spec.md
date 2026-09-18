# 132 — Architecture confirm after revise plan

## Goal

On revise, confirm the 改进卡 first; only then confirm (or redesign)
system architecture; dispatch the revision after architecture is confirmed.

## In scope

- 「改进方案确认」enabled by revise-card validation alone (not architecture)
- After plan confirm: lock revise fields, open architecture gate
  (keep prior diagram as preview needing re-confirm, or redesign)
- After architecture confirm in this path: run revise dispatch
- Persist `revisePlanConfirmed` in project chat
- Copy / E2E for the new order

## Out of scope

- Changing first-dispatch (requirements → architecture → 派工) order
- Changing Archify render pipeline

## Acceptance

1. With prior architecture still marked confirmed, revise dispatch button
   still says 改进方案确认 and is not blocked by architecture
2. Clicking it locks the 改进卡, then requires architecture confirm
   (hint explains plan confirmed; confirm or redesign)
3. Confirming architecture then enqueues `/api/revise`
4. L0 + L1 (project-chat/smoke markers) + `npm run test:live` pass
