# Brief: Every architecture node click zooms in embed

## Symptom

In the Duaer desk architecture embed, some nodes appear to enlarge on click
and others do not.

## Cause

Archify camera `reveal` uses a mobile path when iframe width ≤720 (no zoom
unless wide-diagram), and with `includeNeighbors:true` often snaps scale to 1
when the neighborhood is large — so hub nodes look “unzoomable”.

## Acceptance

1. In embed mode, clicking any component node zooms that node (desktop framing)
2. Patch applies on deliver and on `/api/architecture/*.html` serve
3. Existing height-fit embed CSS still applies
