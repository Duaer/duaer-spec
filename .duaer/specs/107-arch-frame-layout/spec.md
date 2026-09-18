# Brief: Architecture frame vertical, hide when empty

## Goal

Architecture iframe: vertical growth with no fixed height cap when a
diagram exists; fully hidden when there is no diagram.

## Acceptance

1. No fixed 280px height on the frame when showing a diagram
2. Frame height follows diagram viewBox (vertical space as needed)
3. Frame not visible (no empty box) without a diagram URL
