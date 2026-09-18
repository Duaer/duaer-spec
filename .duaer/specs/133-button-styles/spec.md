# 133 — Fix missing / misaligned button styles

## Goal

Repair desk buttons that look unstyled or shifted: undefined CSS
variables, full-width confirm inside flex rows, revise CTA offset.

## Acceptance

1. No `var(--muted)` — use `--mute`
2. Architecture confirm + redesign sit in one aligned row (not 100% width stack)
3. Revise-panel「再改一版」aligns with the card edge (no stray left margin)
4. Preview service start button keeps compact auto width
5. L0 + `npm run test:live` pass; E2E-101 noted
