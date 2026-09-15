---
name: "duaer-do"
description: "Autonomous job loop for digital employees: Brief → work → accept. Agents must follow this whenever the user asks for product work — without waiting for the user to invoke this skill or any CLI."
compatibility: "Requires duaer-spec project structure with .duaer/ directory"
metadata:
  author: "duaer-spec"
  source: "duaer-spec"
---

## Trigger

Any human ask that needs code or product behavior changed.  
**Do not require** the human to type `/duaer-do` or name phases.

## User Input

```text
$ARGUMENTS
```

If empty, use the current conversation ask as the job.

## Goal

Run one job end-to-end. The human should only review the result.

Do **not** lecture about methodology. Do **not** ask them to run commands.

## Steps (you perform these)

1. **Assign** — Ensure an active Brief:
   - Matching active job (`.duaer/active-job.json` + `spec.md`) → update acceptance if needed.
   - Else create `.duaer/specs/<nnn-slug>/spec.md` and `.duaer/active-job.json`
     (same outcome as specify). Keep small asks short: what / why / acceptance.

2. **Break down** — If `tasks.md` missing, write a short checklist from the Spec.
   Skip a heavy plan unless architecture or contracts change.

3. **Work** — Implement open tasks; mark `[x]` as you go. No scope beyond Spec.

4. **Accept** — Converge against Spec: stamp `delivery.json` `accepted`, or append
   gap tasks and implement them when small enough; otherwise one clear remaining note.

5. **Handoff** — One line to the human:
   - `✅ Job accepted — ready for your review.`
   - `⏳ Job not accepted yet — <one sentence>.`
   Never claim done unless accepted + tasks clear. Git is not locked by this.

## Hotfix

Still a short Spec (symptom / cause / acceptance), then work + accept. Same handoff.

## Never

- Ask the human to run `/duaer-*`, `duaer status`, or `duaer policy`.
- Discuss policy modes unless they ask.
- Block on slash-command invocation.
