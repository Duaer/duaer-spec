# Feature Specification: FDE-02 API contract gate

## Goal

Enforce an API contract declaration on feature confirm cards (OpenAPI/types
path, or explicit「本模块无 HTTP API」). When HTTP APIs are in scope, kickoff
injects contract sync / Mock / CI contract-test tasks so联调不再追字段.

## In scope

- Confirm card field `apiContract` + validate / chat prompts / SSE passthrough
- Fingerprint includes the field
- Task pool injects FDE-02 shared tasks when any module declares a contract path
- Deliverables show the field
- Docs / E2E / tests

## Out of scope

- Built-in OpenAPI editor, codegen, or running customer CI
- Bug desk (skips field like other FDE-01 extras)

## Acceptance

1. Feature confirm without apiContract fails local validate
2. 「本模块无 HTTP API」passes without injecting contract tasks
3. A path like `openapi/openapi.yaml` injects three shared pool tasks
4. Chat SSE / clip / deliverables carry the field
5. `npm test` + `npm run test:live` pass
