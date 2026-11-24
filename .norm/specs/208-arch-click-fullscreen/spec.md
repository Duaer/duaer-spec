# Spec: Architecture click opens fullscreen only

## Goal

On the live desk system-architecture (and same-style) mounts, a click opens the
fullscreen present view. Node zoom / enlarge-on-click in the embed is removed.

## In scope

- Host click (capture) opens `present=1` fullscreen and stops Archify node zoom
- Disable desk embed `installDesktopReveal` zoom path
- Update E2E catalog lines that still require embed node zoom

## Out of scope

- Changing fullscreen present page itself
- Removing the explicit「全屏查看」button

## Acceptance

- [ ] Clicking the architecture diagram opens fullscreen present (new tab)
- [ ] Clicking a node does not zoom / enlarge that node in the desk embed
- [ ] Task-path / revise mounts keep the same click → fullscreen behavior
- [ ] Tests and E2E catalog match the new behavior
