# Feature Specification: Understand gate before implement

**Feature Branch**: `feat/understand-gate`

**Created**: 2026-09-15

**Status**: Active

**Input**: User wants casual asks restated and confirmed as precise requirements before coding.

## User Scenarios & Testing

### User Story 1 - Casual ask gets a restatement first (Priority: P1)

A human says something vague (e.g. "消息没回复修好一下"). The digital employee restates a precise Brief (goal / scope / acceptance / out of scope), asks only what blocks precision (or offers recommended defaults), and does **not** start implementation until the human confirms or corrects.

**Independent Test**: Read `duaer-do` + DUADER + AGENTS; confirm Understand is required before Work for underspecified asks.

**Acceptance Scenarios**:

1. **Given** a vague product ask, **When** the agent runs `duaer-do`, **Then** it presents an intent restatement and waits for confirm before implement.
2. **Given** a clear ask with explicit acceptance (or hot-fix with clear repro), **When** the agent runs `duaer-do`, **Then** it may proceed after a short restatement without a blocking Q&A.
3. **Given** the human says skip / just do it, **When** noted in the Brief, **Then** implement may proceed with recorded assumption risk.

## Requirements

- **FR-001**: `duaer-do` MUST include an **Understand** step after Assign (or as part of Assign) and before Break down / Work.
- **FR-002**: Understand MUST restate: what / why / in-scope / out-of-scope / how we will know it is done.
- **FR-003**: If the ask is underspecified, the agent MUST wait for human confirmation (or answers to ≤3 blocking questions) before Work.
- **FR-004**: Confirmed intent MUST be written into the Brief (`spec.md`) before tasks/implement.
- **FR-005**: Host-facing docs (DUADER, AGENTS autonomous loop, Cursor duaer-spec rule) MUST mention the Understand gate so agents do not skip it.
- **FR-006**: Deep `/duaer-clarify` remains for post-spec ambiguity; Understand is the lightweight front door for every casual ask.

## Success Criteria

- **SC-001**: A new agent reading only duaer-do knows not to jump from chat to code without restating and confirming when the ask is vague.
- **SC-002**: Humans experience "整理需求 → 确认 → 开发" without typing phase names.

## Verification

- L0: Doc/skill review (this change is methodology text).
- E2E catalog: update scenario for `duaer-do` Understand gate.
