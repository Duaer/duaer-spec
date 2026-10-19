# Feature Specification: Split coarse acceptance into sentence atoms

**Feature Branch**: `feat/atomic-clause-split`

## Goal

When a confirmed module has no task list yet, decompose acceptance into one
checkbox per clause. A paragraph splits on sentences. Empty acceptance uses
sentences from the goal. One remaining sentence stays one task.

## Why

Kickoff only split newlines and semicolons. A single paragraph, or an empty
acceptance field, became one coarse "Satisfy acceptance" task (bugs skipped
acceptance tasks entirely). Filler "atomic step" rows padded short checklists.

## In scope

- `splitAcceptanceLines` also splits sentence boundaries and inline `1. 2.` lists
- Empty acceptance falls back to goal sentences in the feature pool, bug pool,
  and preview pools
- Revision change text splits the same way
- Remove filler atomic-step padding
- Desk hint, docs, E2E, tests

## Out of scope

- LLM rephrasing at kickoff
- Changing `dependsOn` so acceptance clauses run in parallel
- Splitting on commas

## Acceptance

1. "Hero is visible. Footer stays put." yields two acceptance tasks.
2. Empty acceptance with a two-sentence goal yields two acceptance tasks.
3. "Open /login see form" stays one acceptance task.
4. URLs and versions are not split on `.`.
5. Checklists do not contain "atomic step" filler.
6. Docs and E2E mention the rule; unit tests cover it.

## Assumptions

- Sentence boundaries are full stops and `!` / `?` followed by whitespace,
  including the CJK full stop.
- No model call. Mechanical split only.
