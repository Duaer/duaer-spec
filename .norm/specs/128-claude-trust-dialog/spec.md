# Feature Specification: Pre-accept Claude folder trust on FED dispatch

## Intent

When FED launches Claude Code into a product worktree the human already chose,
pre-set `hasTrustDialogAccepted` so Terminal is not blocked by the
「Yes, I trust this folder」 dialog.

## Why

Cursor launches already use `--trust`. Claude still stops on workspace trust
even with `--permission-mode bypassPermissions`.

## In scope

- Before Claude Terminal launch, mark the worktree (and product git root when
  under `.worktree/`) trusted in `~/.claude.json` / `$CLAUDE_CONFIG_DIR/.claude.json`
- Preserve existing config JSON; only set `projects[path].hasTrustDialogAccepted`
- Unit tests + docs note; E2E marker

## Out of scope

- Bypassing trust for arbitrary/untrusted folders outside FED dispatch
- Changing Claude permission mode further

## Acceptance

1. Claude FED launch path calls trust helper before spawn
2. Helper writes `hasTrustDialogAccepted: true` for worktree (+ parent product root)
3. Existing ~/.claude.json keys are preserved
4. `npm test` subset + docs mention
