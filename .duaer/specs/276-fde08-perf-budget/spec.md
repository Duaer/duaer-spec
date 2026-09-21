# Feature Specification: FDE-08 performance budget

## Goal

A feature confirm card cannot pass on a vague speed claim. It must record
LCP, INP, bundle size, virtualized long lists, a weak-network check, and a
large-data check. Kickoff schedules that budget before implementation.

## In scope

- Local validate on perfBudget
- One FDE-08 task per confirmed module that declares page performance,
  placed before implement and after the env probe, data precheck, and
  external-dependency board when those exist
- Hint, placeholder, and chat/accept prompts
- Explicit opt-out: no page performance requirement

## Out of scope

- Bug desk
- Running a customer performance lab from the desk

## Assumptions

- The desk records the budget; the digital employee runs the weak-network
  and large-data checks.
- 「本模块无页面性能要求」 / "no page performance" skips the six items
  and the kickoff task.
- "挺快的" and other vague speed lines fail.

## Acceptance

1. A vague speed line, or a line missing any of the six items, fails
   local validate
2. All six present, or the no-page-performance opt-out, passes
3. Kickoff adds an FDE-08 task before implement when page performance is
   declared, and skips it on the opt-out
4. npm test and npm run test:live pass
