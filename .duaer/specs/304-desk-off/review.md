Round: 1
Commit: d22aa6dfaaaa46102d4cbd519a586dcbf9b9c462

What this change does: Handoff no longer restarts the FDE desk. `.duaer/handoff.json` has no commands left, and AGENTS.md, the Claude / Cursor workflow rules, the 8787 rule and live-desk.md now say: never start or restart the desk on handoff; start it only when the user asks, on 8787 only. No code changes.

Checked: no `kickstart` / `live8787` restart left in handoff.json, AGENTS.md, rules or docs (only the "do not kickstart" line); `duaer handoff --run` with an empty command list runs nothing; English docs have no Chinese except the existing 派工图 label; `npm test` 297 pass.

Looks good. Ship.

Verdict: Ship.
