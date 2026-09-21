# Feature Specification: FDE-06 import precheck

## Goal

A feature confirm card cannot pass until it records a field mapping, an
import precheck failure list, and that the list can be exported for
cleanup. Kickoff schedules that precheck before implementation.

## In scope

- Local validate on dataPrecheck
- One FDE-06 task per confirmed module that declares an import, placed
  before that module's implement task and after the environment probe
  when both exist
- Hint, placeholder, and chat/accept prompts
- Explicit opt-out: no import for this module

## Out of scope

- Bug desk
- Scanning a customer database from the desk

## Assumptions

- The desk records the checklist; the digital employee produces the
  mapping, the failure list, and the export.
- 「本模块无导入」 / "no import" skips the three requirements and the
  kickoff task.

## Acceptance

1. A vague line or a line missing mapping, failure list, or export fails
   local validate
2. All three present, or the no-import opt-out, passes
3. Kickoff adds an FDE-06 data precheck before implement when an import
   is declared, and skips it on the opt-out
4. npm test and npm run test:live pass
