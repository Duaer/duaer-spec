# 147 — Passport expands fully without inner scroll

## Goal

Inside the architecture node passport, list content expands to full height
with no inner scrollbar. The desk iframe grows so the expanded chip is not
clipped.

## Acceptance

1. Embed CSS: focus-chip + relationship-lens-list overflow visible, max-height none
2. Embed script expands relations and posts height to the desk
3. Desk listens and sizes the architecture iframe accordingly
4. Unit + live smoke pass
