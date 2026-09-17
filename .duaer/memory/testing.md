# Testing expectations (project contract)

Agents **must** read this file before marking work verified or accepting a job.
This file is the **duaer-spec** repo contract. Adopters replace command examples
with their product scripts; keep the level model and risk rules unless an ADR
documents a change.

## Levels

| Level | What | Typical commands (this repo) | Default owner |
|---|---|---|---|
| **L0** | Lint / typecheck / static | `node --check bin/duaer-live.mjs` `node --check web/live-dev/app.js` | After every implementation pass |
| **L1** | Unit tests for changed modules | `npm test` when unit files exist under `test/` | Default for code changes |
| **L2** | Integration / product acceptance at changed boundaries | project acceptance or integration suite | When boundaries or core paths change |
| **L3** | Automated E2E / protocol smoke for user-visible paths | **`npm run test:live`** (live desk shell + `/api/validate` gate; mock LLM, no paid API) | When live desk UI / protocol UX changes |
| **L4** | Manual account / device path when automation cannot cover auth or real data | documented steps in the Brief | When UI/auth and no automated substitute |

IDE Browser / MCP exploration is **optional discovery**. It does **not** replace
L3 when `npm run test:live` covers the touched path.

## Risk table (what to run)

| Change touch | Minimum before accept / merge to `develop` |
|---|---|
| Docs / comments only | None (note in Brief) |
| Internal code, same behavior | L0 + L1 for affected packages |
| API / data / core path | L0 + L1 + L2 (or documented equivalent) |
| User-visible or protocol-visible UI/UX (live desk) | L0 + **`npm run test:live` (L3)** + update E2E catalog |
| Auth / payments / irreversible ops | Above + L4 if L3 cannot cover |

Prefer **targeted subsets** over full monorepo suites. Do not skip a required
level without an explicit waiver in the feature docs (`tasks.md` or Spec).

## Live desk L3 (`npm run test:live`)

Covers without a paid LLM:

1. Desk shell HTML/CSS/JS markers (three columns, structured confirm fields,
   `validationAllowsSend`)
2. Local validate failures (empty / too-short card)
3. `/api/validate` pass and `/api/validate/fix` via an in-process mock
   OpenAI-compatible server

Does **not** cover: real model quality, Terminal CLI launch, or full revise
dispatch. Those stay manual E2E catalog rows or future suites.

## Opt-in (still need an explicit ask or Spec note)

Mark these in the project table when they are expensive:

- Full-repo E2E (vs subset)
- Remote CI-only jobs the agent would trigger manually
- Live paid LLM / third-party smoke
- Production / staging account checks beyond local

Absence from this opt-in list means the agent **runs** the level when the risk
table requires it — the human does **not** have to re-request ordinary
verification.

## Definition of Done (agent-owned work)

Before `delivery.json` `accepted` and before merging the request branch into
local **`develop`**:

1. [ ] Required levels from the risk table have been **executed** (or waived in writing)
2. [ ] Failures fixed or the job left `open` with a clear remaining note
3. [ ] User/protocol-visible changes: E2E catalog scenario added/updated
4. [ ] Handoff mentions what was run (commands + result)

## Phase hooks (Duaer)

| Phase | Verification action |
|---|---|
| `specify` | Independent Test + acceptance scenarios; name expected levels |
| `plan` | Fill **Testing** with concrete commands / levels |
| `tasks` | **Default:** verification tasks per story (not optional) |
| `implement` | Run relevant checks as tasks complete |
| `converge` | Refuse `accepted` without verification evidence or waiver |

## Waivers

A waiver must state: which level, why it cannot run now, and the follow-up.
“Too slow” alone is not enough if a subset command exists.

## Adopter profiles

Thick product examples (e.g. `examples/dianwu-flow/testing.md`) may add L5+
layers (Playwright CI, live LLM, expert review). Those extend this contract;
they do not replace it.
