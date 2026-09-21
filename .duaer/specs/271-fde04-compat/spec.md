# Feature Specification: FDE-04 browser matrix evidence

## Goal

A feature confirm card cannot pass with a vague browser line. The device
matrix must name real targets, point at evidence, and state a fallback.
Kickoff schedules that check.

## In scope

- Local validate on deviceMatrix
- One FDE-04 task per confirmed module
- Hint, placeholder, and chat/accept prompts

## Out of scope

- Bug desk
- Running a device lab

## Acceptance

1. "主流浏览器" or a single browser name fails local validate
2. Two named targets plus screenshot/cloud evidence plus a fallback passes
3. Kickoff adds an FDE-04 compat evidence task
4. npm test and npm run test:live pass
