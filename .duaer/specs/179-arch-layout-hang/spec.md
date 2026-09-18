# Fix: architecture layout hang freezes live desk

## Symptom

「查看交付物」hangs; architecture generation stuck; live server at ~100% CPU
and stops answering any HTTP request.

## Cause

`layoutArchitectureIr` re-queued nodes when finding longer paths. Cyclic
`connections` (common in real IR) made the BFS run forever and blocked Node.

## Acceptance

1. Cyclic IR layouts finish in <500ms
2. Deliverables HTML has no Google Fonts network dependency
3. Live server responds after restart; npm tests pass
