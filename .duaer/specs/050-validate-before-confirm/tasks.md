# Tasks: Validate before confirm / revise dispatch

**Brief**: `.duaer/specs/050-validate-before-confirm/`

## Checklist

- [x] Wire confirm-card send (Confirm) to require a successful auto-accept
      pass for the current card fields; keep button disabled/blocked until pass
- [x] Wire revise-card dispatch the same way (auto-accept for revise card)
- [x] On validation failure: surface issues; keep auto-fix; refuse Brief
      write / revise launch while failed
- [x] Re-run or invalidate the pass when card fields change after a prior pass
- [x] Update agent launch prompts: Brief already accepted — execute; no
      clarifying multi-choice confirmation loop
- [x] Smoke: `/api/validate` + `/api/validate/fix`; E2E-051
- [x] Accept; merge develop; handoff live
