# Feat: multi-worker dispatch progress

## Goal

When kickoff launches more than one digital employee, the Progress column
**派工进度** shows each worker's status — not only a single aggregate checklist.

## Acceptance

1. Status payload includes a `workers[]` list when `workerCount > 1`
2. Each worker entry has: id, task done/total, current task, terminal busy/queue,
   and a short log tail when available
3. Progress UI renders one lane/card per worker under 派工进度
4. Single-worker dispatch keeps the existing one-panel UI
5. Unit/smoke cover workers payload + DOM markers; E2E catalog updated
