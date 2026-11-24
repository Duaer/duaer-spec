# Feature Specification: FDE-05 external dependency board

## Goal

A feature confirm card cannot pass until it records a blocker, an SLA, a
backup mock, and a parallel path for third-party, ERP, or SSO work.
Kickoff schedules that board before implementation.

## In scope

- Local validate on externalDeps
- One FDE-05 task per confirmed module that declares an external
  dependency, placed before implement and after the env probe and data
  precheck when those exist
- Hint, placeholder, and chat/accept prompts
- Explicit opt-out: no external dependency

## Out of scope

- Bug desk
- Calling the vendor or the customer ERP from the desk

## Assumptions

- The desk records the board; the digital employee keeps the blocker,
  SLA, mock, and parallel path current.
- 「本模块无外部依赖」 / "no external dependency" skips the four items
  and the kickoff task.

## Acceptance

1. A vague line or a line missing blocker, SLA, mock, or parallel path
   fails local validate
2. All four present, or the no-dependency opt-out, passes
3. Kickoff adds an FDE-05 task before implement when a dependency is
   declared, and skips it on the opt-out
4. npm test and npm run test:live pass
