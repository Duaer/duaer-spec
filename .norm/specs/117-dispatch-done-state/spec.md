# Brief: Dispatch button stays finished after launch

## Symptom

After「派工并用 Claude Code 启动」succeeds, the button can show the launch
label again (refresh, project restore, or client timeout while the server
already dispatched).

## Goal

Once a job is dispatched, the primary dispatch control stays in the finished
「已派工」/ Dispatched state and is not re-enabled for another first launch.

## In scope

- Persist `dispatchPhase: "done"` in project chat
- Restore done from session and from `/api/status` when already dispatched
- On dispatch client timeout/error, recover done if status shows dispatched

## Out of scope

- Revise /「再改一版」flow
- Changing agent launch mechanics

## Acceptance

1. After successful dispatch, button shows「已派工」and stays disabled
2. Refresh / re-open the same project keeps「已派工」when the job was dispatched
3. Status with `dispatch.worktreePath` / `dispatchedAt` / dispatched|revising|accepted marks done
4. L0 + project-chat unit + `npm run test:live`
