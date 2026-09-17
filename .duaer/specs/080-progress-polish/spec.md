# Feature Specification: Progress column polish

**Feature Branch**: `feat/progress-polish`  
**Brief**: `.duaer/specs/080-progress-polish/`  
**Status**: Active

## Goal

Make the right-hand **任务进度** column clearer and calmer: readable run
cards, a simple done/total meter, checklist rows, quieter empty state —
without changing progress data semantics.

## Acceptance

1. Empty state and run blocks look intentional (not bare dashed box / hairlines)
2. Active run readable; done / current tasks visually distinct
3. Summary shows a thin progress meter from done/total
4. `npm test` + `npm run test:live` pass
