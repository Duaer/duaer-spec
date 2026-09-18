# Brief: Preview URL required on every accepted delivery

## Symptom

Accepted jobs often show「未找到 preview / index.html」even when a local
HTTP service exists (e.g. `http://localhost:8788`). Agents treat preview as
optional for non-page work.

## Goal

Every accepted delivery must expose a openable result URL: a page path **or**
a service address. The desk must not land on the missing-preview message when
a service URL can be known.

## In scope

- Agent / tasks prompts: `preview.url` mandatory (page or `http://localhost:…`)
- `resolvePreview` infers service URL from README / package.json / server entry
- Desk start-command + i18n copy align with mandatory preview
- Auto-inferred service URLs show as「查看结果」

## Out of scope

- Auto-starting the local server process on click (link opens the address)

## Acceptance

1. Prompt + tasks.md require preview.url for every accept
2. Worktree with README `http://localhost:8788` and no index.html → status.preview.url is that address
3. Accepted bubble uses preview link when inferred (not missing copy)
4. L0 + unit + L3
