# Feat: reliable multi-worker task orchestration

## Goal

Gate digital-employee work by `dependsOn`: only prompt ready waves, and
auto-release the next wave when `tasks.md` checkboxes unlock dependencies.

## Acceptance

1. Kickoff prompts contain only ready task ids (not blocked dependsOn)
2. Status poll advances orchestration: idle lane gets continue with next wave
3. `assignTasksToWorkers` inherits first-dependency worker when possible
4. Progress lanes show `waiting_deps` when owned work is blocked
5. Unit tests cover orchestrate helpers; live smoke still passes
