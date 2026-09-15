---
name: "duaer-do"
description: "Simple one-shot: turn a user ask into an assigned job, implement it, and hand off. Prefer this for everyday work instead of chaining specify/plan/tasks/implement/converge."
compatibility: "Requires duaer-spec project structure with .duaer/ directory"
metadata:
  author: "duaer-spec"
  source: "duaer-spec"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** use the user input as the job request (if not empty).

## Goal

**Everyday path — keep it simple.** Run one digital-employee job end-to-end without
asking the user to chain slash commands.

Do **not** lecture about methodology. Do the work.

## Steps (always in order)

1. **Assign** — Ensure an active feature Brief exists:
   - If there is already a clear active job (`.duaer/active-job.json` + `spec.md`)
     that matches this ask, update that `spec.md` acceptance as needed.
   - Otherwise run the same outcome as `/duaer-specify` for this ask
     (create `.duaer/specs/<nnn-slug>/spec.md`, write `.duaer/active-job.json`).
   - For small asks: keep the Spec short (what / why / acceptance only).

2. **Break down (lightweight)** — If `tasks.md` is missing:
   - Write a short `tasks.md` with a few `- [ ]` items from the Spec.
   - Skip `/duaer-plan` unless architecture or contracts clearly change.
   - If `tasks.md` already exists, use it.

3. **Work** — Implement open tasks (same rules as `/duaer-implement`).
   Mark tasks `[x]` as you finish them. Do not expand scope past the Spec.

4. **Accept** — Run the same outcome as `/duaer-converge`:
   - Compare code to Spec; append gap tasks or stamp `delivery.json` accepted.
   - If gaps were appended, either implement them now (preferred for small jobs)
     or stop and tell the user what remains — once.

5. **Handoff line** — End with exactly one clear status:
   - If accepted: `✅ Job accepted — ready for your review.`
   - If not: `⏳ Job not accepted yet — <one sentence what to do next>.`
   - Do **not** claim "done" unless `delivery.json` is `accepted` and tasks are clear
     (coach/strict policy). Git is not locked.

## Hotfix

If the user says hotfix/bug/regression: still write a short Spec (symptom / cause /
acceptance), then tasks → implement → converge. Same handoff line.

## Out of scope for this command

- Do not require the user to run `/duaer-plan`, `/duaer-checklist`, or `/duaer-analyze`.
- Do not discuss policy modes unless they ask.
- Do not turn this into a merge/CI lecture.
