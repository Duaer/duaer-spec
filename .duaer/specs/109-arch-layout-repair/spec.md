# Brief: Repair Archify layout before deliver

## Goal

Architecture render must succeed when model IR has long CJK sublabels or
edge labels that Archify rejects for width / overlap.

## Acceptance

1. Long sublabels truncated or components widened before deliver
2. Labeled connections get labelDy so they do not sit on nodes
3. Contaminated ban-store style IR renders successfully in tests
