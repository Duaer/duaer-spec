# Tasks

- [x] T1 Reproduce: after accept, revise returns HTTP 200 but Terminal stays on first agent
- [x] T2 Locate busy-queue / priorAccepted path in live revise dispatch (do not edit until ready)
- [x] T3 Preempt busy runner when revise is priorAccepted so queued revise starts in Terminal
- [x] T4 Keep pre-accept busy wait (no interrupt) unchanged
- [x] T5 Add next free E2E scenario (hint: E2E-047) to `docs/agent/e2e-test-plan.md`
- [x] T6 Verify: priorAccepted revise preempts and Terminal shows revise; HTTP settles
- [x] T7 Stamp `delivery.json` when acceptance criteria met
