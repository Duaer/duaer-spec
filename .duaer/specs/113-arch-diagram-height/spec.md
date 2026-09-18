# Brief: Remove diagram-container height clip in embed

## Symptom

Archify `.diagram-container` uses `overflow: hidden` and embed body clips;
the Duaer iframe also sized height from viewBox units as if they were CSS
pixels, so tall/wide diagrams get cropped.

## Acceptance

1. Delivered HTML for the desk injects embed CSS: no max-height / overflow
   clip on `.diagram-container` (or body) in `data-embed=true`
2. Iframe height follows diagram aspect ratio × frame width (not raw viewBox Y)
3. Diagram shows fully under Planned hosting without vertical crop
