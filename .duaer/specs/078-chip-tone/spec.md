# Feature Specification: Quieter choice chips

**Feature Branch**: `fix/chip-tone`  
**Brief**: `.duaer/specs/078-chip-tone/`  
**Status**: Active

## Goal

Chat choice buttons (e.g. 网页端 / 移动端 / 后台) stay clickable but use a
calmer surface — not orange-heavy / high-emphasis CTAs.

## Acceptance

1. `.choice-chip` uses muted plate/line styling (no strong register fill)
2. Hover still readable; primary Send/Confirm unchanged
3. `npm run test:live` passes
