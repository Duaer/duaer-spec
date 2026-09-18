# 150 — Revise kickoff: show real errors, stop chrome races

## Goal

「再改一版」must start the revise dialogue reliably. When it fails, show the
real reason — not only the generic「改进对话启动失败」. Stop right-panel
focus/rebuild from racing the streaming kickoff.

## Acceptance

1. Kickoff catch paints real `err.message` (stack-overflow → friendly copy)
2. Failed kickoff still persists an assistant error turn into reviseMessages
3. `renderRevisePanel` does not focusRight while reviseDialogueOpen
4. enterReviseMode defers accordion/chrome until after kickoff starts cleanly
5. L0/L3 pass
