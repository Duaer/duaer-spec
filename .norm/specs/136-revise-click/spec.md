# 136 — Fix dead clicks on 再改一版 / version accordion

## Goal

Clicks on 再改一版 and version accordion headers must respond.

## Cause

1. Status poll rebuilt the accordion every few seconds (DOM replaced mid-click)
2. 再改一版 was disabled while `busy`, so clicks did nothing

## Acceptance

1. Accordion only rebuilds when version data changes
2. 再改一版 stays clickable unless revise is dispatching; enter clears stale busy
3. L3 smoke + markers pass
