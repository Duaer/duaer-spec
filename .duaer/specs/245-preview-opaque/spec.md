# Brief: Opaque result bar

## Symptom

Sticky result bar uses a translucent teal fill; scrolled content shows through.

## Acceptance

1. `.preview-panel` background is opaque (solid plate + lock tint, no alpha bleed)
2. Sticky bottom still works; content does not show through the bar
3. Cache-bust CSS; wire test asserts opaque background
