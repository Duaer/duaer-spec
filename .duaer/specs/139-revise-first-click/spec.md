# 139 — 再改一版 reacts on the first click

## Goal

Clicking「再改一版」once must immediately show a user message in the left
chat and start the employee reply. A second click must not be required.

## Cause

1. `enterReviseMode` called `renderRevisePanel({ delivery: accepted })`,
   which set `lastDeliveryAccepted = true` while `mode === "revise"`,
   breaking the mid-dialogue guard and re-entry behavior.
2. Every `addBubble` forced `focusRightPanel`, so the first chat update
   was easy to miss (right column stole focus).
3. Heavy chrome/accordion ran before kickoff.

## Acceptance

1. First CTA click: visible user bubble + kickoff fetch starts
2. Mid-dialogue re-click: focus chat; re-kick only if idle with no reply
3. Keep chat focused while revise dialogue is open
4. L3 `npm run test:live` passes
