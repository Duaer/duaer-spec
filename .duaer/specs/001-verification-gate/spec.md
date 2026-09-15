# Feature Specification: Verification gate for development

**Feature Branch**: `feat/verification-gate`

**Created**: 2026-09-15

**Status**: Active

**Input**: Evolve duaer-spec so adopting projects require risk-based verification during development (not docs-only E2E; not default “skip E2E”).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent must verify before accept (Priority: P1)

As a human using a digital employee on an adopting project, I want the agent to run the project's required checks for the change before marking the job accepted, so “done” means verified, not only Spec-matched.

**Why this priority**: Closes the gap between Spec converge and real quality.

**Independent Test**: Read AGENTS + `duaer-do` + converge; confirm accept path requires verification per `.duaer/memory/testing.md`.

**Acceptance Scenarios**:

1. **Given** a user-visible change, **When** the agent converges, **Then** it must run (or record a justified waiver for) the levels required by `testing.md`, and stamp `delivery.json` only when that gate is satisfied.
2. **Given** an internal-only change, **When** the agent works, **Then** it still runs L0/L1 (or project equivalent) when those commands exist, and may skip browser E2E.

### User Story 2 - Project testing contract is actionable (Priority: P1)

As an adopting project, I get a concrete `.duaer/memory/testing.md` that defines levels, when to run what, and the merge-to-develop minimum — not a five-line stub.

**Independent Test**: Open installed `testing.md`; it names levels, risk table, DoD, and phase hooks.

### User Story 3 - Policy no longer forbids needed E2E (Priority: P1)

As an agent, I am instructed to run risk-appropriate automated E2E / browser suites from the project contract, instead of a blanket “do not run E2E unless the user asks”.

**Independent Test**: AGENTS / workflow R3 / change-checklist no longer contain the blanket ban; they point at `testing.md`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST publish an actionable `.duaer/memory/testing.md` template (levels L0–L4+, risk table, DoD, phase hooks, waiver rules).
- **FR-002**: AGENTS and workflow MUST require risk-based verification for agent-owned development; MUST NOT blanket-forbid local E2E.
- **FR-003**: `duaer-do`, `duaer-tasks`, and `duaer-converge` MUST treat verification as default (tasks include it; accept requires evidence or explicit waiver).
- **FR-004**: E2E scenario catalog docs remain required for user/protocol-visible changes (R3 docs) **and** execution follows `testing.md`.
- **FR-005**: ADR MUST record the policy change (verification gate).
- **FR-006**: Host always-on rules (`agents-workflow`) MUST mention verification, not only E2E docs.
- **FR-007**: Expensive / remote / full-suite or live-LLM runs MAY still require explicit user ask when `testing.md` marks them as opt-in; subset E2E for touched UI paths MUST run when the project defines those commands.

### Non-goals

- Scaffolding Playwright into every adopter by default.
- Requiring IDE Browser MCP.
- Changing R6 PR principle (third-party completeness may still be follow-up).

## Success Criteria

- **SC-001**: A new agent reading only AGENTS + testing.md + duaer-do knows it must verify before accept.
- **SC-002**: Blanket “do not run E2E unless asked” is gone from ops docs.
- **SC-003**: dianwu-flow example remains a thick adopter profile pointing at the shared contract.
