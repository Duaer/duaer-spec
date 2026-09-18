# 154 — Architecture confirm after「请先确认架构」CTA

## Goal

After 改进方案确认, UX order must be:
1. 改进卡 + CTA「请先确认架构，再派这一版」
2. Architecture diagram + confirm button (immediately below the CTA)

Do not leave the diagram above under 计划托管 while the CTA sits far below.

## Acceptance

1. When revisePlanConfirmed && architecture not confirmed, architecturePanel sits after doReviseDispatch
2. Otherwise architecturePanel stays under deploy targets (first-dispatch flow)
3. openReviseArchitectureGate places then scrolls the panel
4. L3 live smoke passes
