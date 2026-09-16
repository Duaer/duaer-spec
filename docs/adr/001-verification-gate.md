# ADR-001: Risk-based verification gate for agent-owned work

- **Status**: Accepted
- **Date**: 2026-09-15
- **Deciders**: duaer-spec maintainers (digital-employee ops)

## Context

duaer-spec required E2E *scenario documentation* (R3) and told agents not to run
local/remote E2E unless the human asked. Specs were “testable,” but Accept /
converge could stamp `delivery.json` without executing checks. Adopters (e.g.
Dianwu Flow) already kept thicker `testing.md` contracts; the default install did
not enforce them.

## Decision

1. `.duaer/memory/testing.md` is the project verification contract (levels,
   risk table, DoD, waivers, phase hooks).
2. Agent-owned development **must** run risk-required levels before job accept
   and before merge to local `develop`. Prefer subsets.
3. Blanket “do not run E2E unless asked” is removed. Opt-in remains only for
   suites the contract marks expensive/remote/live.
4. E2E catalog docs remain required for user/protocol-visible changes.
5. `duaer-tasks` defaults to verification tasks; `duaer-converge` must not
   accept without evidence or waiver; `delivery.json` may include `verification`.
6. R6 third-party PR completeness follow-up is unchanged, except failing
   required suites that would break `main` remain landing blockers.

## Consequences

- Agents spend more time on targeted tests; full-suite cost is controlled by
  subsets and opt-in lists.
- Pure docs/CLI projects without L3 stay valid if the risk table says so.
- Existing installs need `npx duaer-spec update` (or manual pull of
  `testing.md` / AGENTS) to pick up the gate.
