# Feature Specification: Light theme contrast + denser compact

## Goal

Fix unreadable black/dark hardcodes in light theme and tighten desk density
another step.

## Acceptance

1. Light theme inputs, composer, chat bubbles, and primary/confirm buttons
   use theme tokens and stay readable.
2. Shell spacing is tighter than the previous compact pass.
3. `node --test test/desk-theme.test.mjs` and `npm run test:live` pass.
