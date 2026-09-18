# Feature Specification: Contain progress column text

## Intent

Long status / path / task lines in the 运行 (progress) column must wrap
inside the panel — never spill outside.

## Acceptance

1. Progress status, summary, activity, tasks, and log wrap within the column
2. Grid panel has min-width: 0 so the narrow column can shrink without overflow
3. `npm run test:live` passes
