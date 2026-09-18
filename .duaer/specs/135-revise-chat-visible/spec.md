# 135 — Show user revise dialogue when entering 再改一版

## Goal

Clicking 再改一版 switches the chat panel to the revise dialogue thread
so the user can see messages they sent (and prior revise turns).

## Acceptance

1. enterReviseMode clears specify chat and shows reviseMessages (user + bot)
2. Reload in revise mode shows revise thread, not stacked specify+revise
3. Returning from architecture gate to revise restores revise thread
4. L0 + smoke markers + test:live pass
