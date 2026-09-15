# Duaer methodology

AI coding agents are **digital employees**. The human states intent; the agent
runs Brief → **understand** → work → accept. Humans are not the operators of
the phase machine.

**Precedence:** [`AGENTS.md`](AGENTS.md) wins on isolation, commits, Issue/PR.

## Human experience

1. One-time install: `npx duaer-spec init --here`  
2. Later refresh: `npx duaer-spec update`  
3. Ongoing: describe work in chat  
4. Review the handoff line (accepted / not yet)

## Agent procedure (autonomous)

Follow the `duaer-do` skill (`.cursor/skills/`, `.claude/skills/`, or `.agents/skills/`) on every product ask — **without**
waiting for a slash invocation:

1. Assign Brief + `active-job.json`  
2. **Understand** — Restate precise goal / scope / acceptance; if the ask is
   vague, confirm with the human (≤3 blocking questions or recommended
   defaults) before coding; write the confirmed intent into the Brief  
3. Light `tasks.md` if needed (include verification tasks from `testing.md`)  
4. Implement + run risk-based checks  
5. Converge → `delivery.json` (with verification evidence or waiver)  
6. One handoff line; never claim done until accepted  

Large jobs may use step playbooks (`duaer-specify`, `duaer-plan`, …) internally.

## Policy

`.duaer/delivery-policy.json` defaults to `coach`. Agents must not claim done
while the active job is unfinished. This is job etiquette, not a git lock.
Humans need not configure it for everyday use.

## Layout

```text
.worktree/feat-<name>/                 # git isolation (full checkout)
  .duaer/active-job.json
  .duaer/specs/<nnn-slug>/             # Brief (≠ worktree folder name)
    spec.md | tasks.md | delivery.json
.cursor/rules|skills/                  # Cursor
.claude/rules|skills/ + CLAUDE.md      # Claude Code
.agents/skills/ + AGENTS.md            # Codex (+ shared skills)
.github/copilot-instructions.md        # Copilot
.windsurf/rules/ + .devin/rules/       # Windsurf / Devin
.clinerules/ + .continue/rules/        # Cline / Continue
GEMINI.md + .aider.conf.yml            # Gemini / Aider
```

Worktree and Brief are different layers. Prefer
`.worktree/feat-login/.duaer/specs/002-login/` — not
`.worktree/002-login/.duaer/specs/002-login/`.

## Related

- Adopt: [`ADOPT.md`](ADOPT.md)
- Branches / go-live: [`docs/agent/branching-and-release.md`](docs/agent/branching-and-release.md)
- Agent ops: [`AGENTS.md`](AGENTS.md)
