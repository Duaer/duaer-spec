# Feature Specification: Compact desk theme with light/dark toggle

## Goal

Make the FDE desk easier to stare at for long sessions: tighter spacing,
calmer colors (less orange glow / hatch noise), and a light/dark theme
toggle that persists.

## In scope

- Compact shell / header / layout / panel spacing
- Soft dark + light palettes via `html[data-theme]`
- Top-bar theme toggle; persist in `localStorage`; early boot to avoid flash
- Same theme on dispatch-center page
- i18n + docs + smoke markers

## Out of scope

- Redesigning Archify diagram chrome
- Per-project theme overrides

## Acceptance

1. Desk feels denser (smaller brand, tighter gaps/padding).
2. Light and dark themes both readable; toggle switches and persists across reload.
3. `npm run test:live` and i18n key parity pass.
