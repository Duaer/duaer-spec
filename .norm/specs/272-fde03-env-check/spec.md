# Feature Specification: FDE-03 environment checklist

## Goal

A feature confirm card cannot pass until the environment checklist records
DNS, TLS, CORS, auth, and third-party reachability as passed. A failed probe
blocks confirm. Kickoff schedules that probe before implementation.

## In scope

- Local validate on envChecklist
- One FDE-03 task per confirmed module that declares a customer environment,
  placed before that module's implement task
- Hint, placeholder, and chat/accept prompts
- Explicit opt-out: no customer environment

## Out of scope

- Bug desk
- Scanning the customer network from the desk

## Assumptions

- The desk records the checklist; the digital employee runs the probes.
- 「无客户联调环境」 / "no customer environment" skips the five probes and
  the kickoff task.

## Acceptance

1. A vague line, a missing probe, or any failed probe fails local validate
2. All five probes marked passed, or the no-customer opt-out, passes
3. Kickoff adds an FDE-03 env probe before implement when a customer
   environment is declared, and skips it on the opt-out
4. npm test and npm run test:live pass
